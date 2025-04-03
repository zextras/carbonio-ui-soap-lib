/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { HttpResponseResolver } from 'msw';
import { HttpResponse } from 'msw';

import { EndSessionRequest, EndSessionResponse } from '../../../api/EndSession';
import { SoapRequest, SoapResponse } from '../../../types/network';

export const EndSessionRequestHandler: HttpResponseResolver<
	never,
	SoapRequest<{ EndSessionRequest: EndSessionRequest }>,
	SoapResponse<EndSessionResponse>
> = () =>
	HttpResponse.json({
		Body: {
			EndSessionResponse: {}
		},
		Header: {
			context: {}
		}
	});
