/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { waitFor } from '@testing-library/react';
import type { DefaultBodyType, PathParams } from 'msw';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import { legacyXmlSoapFetch, NoOpRequest, NoOpResponse } from './fetch';
import { ApiManager } from '../apiManager/apiManager';
import { JSNS } from '../constants';
import { POLLING_RETRY_INTERVAL } from '../polling/pollingInterval';
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
});
