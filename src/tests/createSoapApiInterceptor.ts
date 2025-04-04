/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { DefaultBodyType, http, HttpResponse } from 'msw';

import { JSNS } from '../constants';
import server from './mocks/server';
import { RawSoapContext } from '../types/network';

type HandlerRequest<T> = DefaultBodyType & {
	Body: Record<string, T>;
};

export const createSoapApiInterceptor = <RequestParamsType, ResponseBodyType = never>(
	apiAction: string,
	body?: ResponseBodyType,
	context?: RawSoapContext
): Promise<RequestParamsType | undefined> =>
	new Promise<RequestParamsType | undefined>((resolve) => {
		server.use(
			http.post<never, HandlerRequest<RequestParamsType | undefined>>(
				`/service/soap/${apiAction}Request`,
				async ({ request }) => {
					const reqActionParamWrapper = `${apiAction}Request`;
					const requestContent = await request.json();

					const params = requestContent?.Body?.[reqActionParamWrapper];

					resolve(params);

					return HttpResponse.json({
						Body: {
							[`${apiAction}Response`]: body || {}
						},
						Header: {
							context: context ?? {},
							_jsns: JSNS.soap
						}
					});
				}
			)
		);
	});
