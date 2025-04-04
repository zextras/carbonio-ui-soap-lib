/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { type RequestHandler, http } from 'msw';

import { EndSessionRequestHandler } from './handlers/endSessionRequestHandler';
import { getInfoRequestHandler } from './handlers/getInfoRequestHandler';

const handlers: RequestHandler[] = [
	http.post('/service/soap/GetInfoRequest', getInfoRequestHandler()),
	http.post('/service/soap/EndSessionRequest', EndSessionRequestHandler)
];

export default handlers;
