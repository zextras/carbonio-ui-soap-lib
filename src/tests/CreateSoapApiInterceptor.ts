/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { DefaultBodyType, http, HttpResponse } from 'msw';

import server from './mocks/server';

type HandlerRequest<T> = DefaultBodyType & {
	Body: Record<string, T>;
};

export const createSoapApiInterceptor = <RequestParamsType, ResponseType = never>(
	apiAction: string,
	response?: ResponseType
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
							[`${apiAction}Response`]: response || {}
						}
					});
				}
			)
		);
	});
