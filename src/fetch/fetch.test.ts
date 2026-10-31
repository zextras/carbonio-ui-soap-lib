/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { waitFor } from '@testing-library/react';
import type { DefaultBodyType, PathParams } from 'msw';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

import { legacyXmlSoapFetch, NoOpRequest, NoOpResponse, soapFetchV2 } from './fetch';
import { ApiManager } from '../apiManager/apiManager';
import { JSNS } from '../constants';
import { POLLING_RETRY_INTERVAL } from '../polling/pollingInterval';
import { createLongPollingSimulator } from '../tests/createLongPollingSimulator';
import { createSoapApiInterceptor } from '../tests/createSoapApiInterceptor';
import { createEventInterceptor } from '../tests/eventInterceptor';
import { noOpRequestHandler } from '../tests/mocks/handlers/noOpRequestHandler';
import server from '../tests/mocks/server';
import type { Duration } from '../types/account';
import type { ErrorSoapResponse, SoapRequest, SoapResponse } from '../types/network';

const GENERIC_API_NAME = 'Some';
const GENERIC_API_ENDPOINT = `/service/soap/${GENERIC_API_NAME}Request`;
const NOOP_API_ENDPOINT = `/service/soap/NoOpRequest`;

describe('Fetch', () => {
	it('should dispatch a AuthErrorEvent event if user session is expired', async () => {
		const eventInterceptor = createEventInterceptor('carbonioAuthError');

		server.use(
			http.post<PathParams, DefaultBodyType, Pick<ErrorSoapResponse, 'Body'>>(
				GENERIC_API_ENDPOINT,
				() =>
					HttpResponse.json({
						Body: {
							Fault: {
								Code: {
									Value: ''
								},
								Reason: { Text: 'Controlled error: auth expired' },
								Detail: {
									Error: {
										Code: 'service.AUTH_EXPIRED',
										Trace: ''
									}
								}
							}
						}
					})
			)
		);

		await legacyXmlSoapFetch(GENERIC_API_NAME, {});
		await waitFor(() => expect(eventInterceptor).toHaveBeenCalled());
	});

	describe('NoOp polling', () => {
		beforeAll(() => vi.useFakeTimers());
		afterAll(() => vi.useRealTimers());
		it.each<[number, Duration]>([
			[500, '500'],
			[500, '500ms'],
			[758, '758ms'],
			[123 * 1000, '123s'],
			[45 * 60 * 1000, '45m'],
			[7 * 60 * 60 * 1000, '7h'],
			[3 * 24 * 60 * 60 * 1000, '3d'],
			[30 * 1000, '5invalid' as Duration]
		])(
			'should call noOp after %s ms if the polling preference is set to %s',
			async (timout, pollingPref) => {
				ApiManager.getApiManager().setPollingPreference(pollingPref);

				const noOpHandler = vi.fn(noOpRequestHandler);
				server.use(
					http.post<PathParams, DefaultBodyType, SoapResponse<unknown>>(GENERIC_API_ENDPOINT, () =>
						HttpResponse.json({
							Body: {},
							Header: {
								context: {}
							}
						})
					),
					http.post(NOOP_API_ENDPOINT, noOpHandler)
				);

				await legacyXmlSoapFetch(GENERIC_API_NAME, {});
				await vi.advanceTimersByTimeAsync(timout);
				expect(noOpHandler).toHaveBeenCalledTimes(1);
			}
		);

		it.each<Duration>(['500', '500ms', '500s'])(
			'should send limitToOneBlocked and wait if the polling preference is set to %s',
			async (pollingPref) => {
				ApiManager.getApiManager().setPollingPreference(pollingPref);

				let noOpRequestBody: SoapRequest<{ NoOpRequest: NoOpRequest }> | undefined;
				server.use(
					http.post<PathParams, DefaultBodyType, SoapResponse<unknown>>(GENERIC_API_ENDPOINT, () =>
						HttpResponse.json({
							Body: {},
							Header: {
								context: {}
							}
						})
					),
					http.post<never, SoapRequest<{ NoOpRequest: NoOpRequest }>, SoapResponse<NoOpResponse>>(
						NOOP_API_ENDPOINT,
						async (info) => {
							noOpRequestBody = await info.request.json();
							return noOpRequestHandler(info);
						}
					)
				);

				await legacyXmlSoapFetch(GENERIC_API_NAME, {});
				await vi.advanceTimersToNextTimerAsync();
				expect(noOpRequestBody).toMatchObject(
					expect.objectContaining({
						Body: {
							NoOpRequest: expect.objectContaining({
								limitToOneBlocked: 1,
								wait: 1
							})
						}
					})
				);
			}
		);

		it('should not send limitToOneBlocked and wait if the polling preference is not set to 500, 500ms or 500s', async () => {
			ApiManager.getApiManager().setPollingPreference('60s');

			let noOpRequestBody: SoapRequest<{ NoOpRequest: NoOpRequest }> | undefined;
			server.use(
				http.post<PathParams, DefaultBodyType, SoapResponse<unknown>>(GENERIC_API_ENDPOINT, () =>
					HttpResponse.json({
						Body: {},
						Header: {
							context: {}
						}
					})
				),
				http.post<never, SoapRequest<{ NoOpRequest: NoOpRequest }>, SoapResponse<NoOpResponse>>(
					NOOP_API_ENDPOINT,
					async (info) => {
						noOpRequestBody = await info.request.json();
						return noOpRequestHandler(info);
					}
				)
			);

			await legacyXmlSoapFetch(GENERIC_API_NAME, {});
			await vi.advanceTimersToNextTimerAsync();
			expect(noOpRequestBody).not.toMatchObject(
				expect.objectContaining({
					Body: {
						NoOpRequest: expect.objectContaining({
							limitToOneBlocked: 1,
							wait: 1
						})
					}
				})
			);
		});

		it.each<[string, () => Response]>([
			['a network error', (): Response => HttpResponse.error()],
			[
				'a non-JSON response',
				(): Response =>
					new HttpResponse('<html><body>502 Bad Gateway</body></html>', {
						status: 502,
						headers: { 'Content-Type': 'text/html' }
					})
			]
		])(
			'should retry the NoOp after the retry interval and then resume the long polling if the NoOp fails with %s',
			async (_, failingResponse) => {
				ApiManager.getApiManager().setPollingPreference('500ms');

				const noOpRequests: Array<SoapRequest<{ NoOpRequest: NoOpRequest }>> = [];
				server.use(
					http.post<PathParams, DefaultBodyType, SoapResponse<unknown>>(GENERIC_API_ENDPOINT, () =>
						HttpResponse.json({
							Body: {},
							Header: {
								context: {}
							}
						})
					),
					http.post<never, SoapRequest<{ NoOpRequest: NoOpRequest }>>(
						NOOP_API_ENDPOINT,
						async ({ request }) => {
							noOpRequests.push(await request.json());
							if (noOpRequests.length === 1) {
								return failingResponse();
							}
							return HttpResponse.json({
								Body: { NoOpResponse: { _jsns: JSNS.mail } },
								Header: { context: {} }
							});
						}
					)
				);

				await legacyXmlSoapFetch(GENERIC_API_NAME, {});
				await vi.advanceTimersByTimeAsync(500);
				expect(noOpRequests).toHaveLength(1);
				expect(noOpRequests[0]).toMatchObject({
					Body: { NoOpRequest: { wait: 1, limitToOneBlocked: 1 } }
				});

				await vi.advanceTimersByTimeAsync(POLLING_RETRY_INTERVAL - 1);
				expect(noOpRequests).toHaveLength(1);

				await vi.advanceTimersByTimeAsync(1);
				expect(noOpRequests).toHaveLength(2);
				expect(noOpRequests[1]?.Body.NoOpRequest).not.toHaveProperty('wait');

				await vi.advanceTimersByTimeAsync(500);
				expect(noOpRequests).toHaveLength(3);
				expect(noOpRequests[2]).toMatchObject({
					Body: { NoOpRequest: { wait: 1, limitToOneBlocked: 1 } }
				});
			}
		);
	});

	describe('Long polling', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			// Start every scenario from a fresh shared instance
			window.carbonioApiManager = undefined;
			ApiManager.getApiManager().setPollingPreference('500ms');
			createSoapApiInterceptor('Search');
		});

		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
			server.resetHandlers();
			// Every scenario ends with a blocking NoOp still pending in the simulator: drop the shared
			// instance, so that its record does not leak into the other tests
			window.carbonioApiManager = undefined;
		});

		it('should send the next blocking NoOp when the pending one returns if the user is idle', async () => {
			const simulator = createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(600_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 301, blocking: true }
			]);
			expect(simulator.waitDisallowedAt).toEqual([]);
		});

		it('should not send a NoOp for a response received while the blocking NoOp is pending', async () => {
			const simulator = createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(60_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(540_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 301, blocking: true }
			]);
			expect(simulator.waitDisallowedAt).toEqual([]);
		});

		it('should send the next blocking NoOp when the pending one returns with a notification', async () => {
			const simulator = createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(60_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(240_000);
			simulator.newMail();
			await vi.advanceTimersByTimeAsync(300_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 300.5, blocking: true }
			]);
			expect(simulator.waitDisallowedAt).toEqual([]);
		});

		it('should fall back to a NoOp without wait if another session cancels the pending one', async () => {
			const simulator = createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(100_000);
			simulator.cancelFromAnotherSession();
			await vi.advanceTimersByTimeAsync(20_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 110, blocking: false },
				{ at: 110.5, blocking: true }
			]);
			expect(simulator.waitDisallowedAt).toEqual([100]);
		});

		it('should postpone the NoOp at every response if the polling preference is an interval', async () => {
			ApiManager.getApiManager().setPollingPreference('60s');
			const simulator = createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(30_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(60_000);
			expect(simulator.sentNoOps).toEqual([{ at: 90, blocking: false }]);
		});

		it('should send a new blocking NoOp at the first response after the max duration if the pending one never returns', async () => {
			const simulator = createLongPollingSimulator({ serverTimeout: 'never' });
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(200_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(200_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(100_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 400.5, blocking: true }
			]);
			expect(simulator.waitDisallowedAt).toEqual([400.5]);
		});

		it('should keep the new blocking NoOp pending if the replaced one fails at network level', async () => {
			const simulator = createLongPollingSimulator({
				serverTimeout: 'never',
				replacedNoOpOutcome: 'networkError'
			});
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(400_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(100_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(100_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 400.5, blocking: true },
				// The retry of the failed NoOp
				{ at: 460.5, blocking: false }
			]);
			expect(simulator.waitDisallowedAt).toEqual([]);
		});

		it('should send a single extra NoOp if the server timeout is longer than the max duration', async () => {
			const simulator = createLongPollingSimulator({ serverTimeout: 600_000 });
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(400_000);
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(600_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 400.5, blocking: true }
			]);
			expect(simulator.waitDisallowedAt).toEqual([400.5]);
		});

		it('should not send a NoOp for a response handled by another copy of the library while the blocking NoOp is pending', async () => {
			const simulator = createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(60_000);
			vi.resetModules();
			const otherCopy = await import('./fetch');
			expect(otherCopy.soapFetchV2).not.toBe(soapFetchV2);
			await otherCopy.soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(540_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 301, blocking: true }
			]);
			expect(simulator.waitDisallowedAt).toEqual([]);
		});

		it('should dispatch the notifications of a response received while the blocking NoOp is pending', async () => {
			createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(60_000);
			createSoapApiInterceptor(
				'Search',
				{},
				{ notify: [{ seq: 2, created: { m: [{ id: '1' }] } }] }
			);
			const syncUpdateInterceptor = createEventInterceptor('carbonioSyncUpdate');
			await soapFetchV2('Search', {});
			expect(syncUpdateInterceptor).toHaveBeenCalledTimes(1);
		});

		it('should apply a new polling preference when the pending blocking NoOp returns', async () => {
			const simulator = createLongPollingSimulator();
			await soapFetchV2('Search', {});
			await vi.advanceTimersByTimeAsync(100_000);
			// As the mails settings do, the preference changes after the response of the save is handled
			await soapFetchV2('Search', {});
			ApiManager.getApiManager().setPollingPreference('60s');
			await vi.advanceTimersByTimeAsync(300_000);
			expect(simulator.sentNoOps).toEqual([
				{ at: 0.5, blocking: true },
				{ at: 360.5, blocking: false }
			]);
		});
	});
});
