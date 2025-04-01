/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { type RequestHandler, http } from 'msw';

import { getGetInfoRequest } from './getInfoRequest';
import { noOpRequest } from './handlers/noOpRequest';

const handlers: RequestHandler[] = [
    http.post('/service/soap/GetInfoRequest', getGetInfoRequest()),
    http.post('/service/soap/NoOpRequest', noOpRequest)
];

export default handlers;
