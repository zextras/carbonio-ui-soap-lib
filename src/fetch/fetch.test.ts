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
import { ApiManager } from '../ApiManager';
import { createEventInterceptor } from '../tests/EventInterceptor';
import { noOpRequestHandler } from '../tests/mocks/handlers/NoOpRequestHandler';
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
	});
});
