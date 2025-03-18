/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { JSNS, SHELL_APP_ID } from './constants';
import { getSoapFetch } from './fetch/fetch';
import { SoapBody } from './types/network/soap';
import { GetInfoResponse } from './types/network';

export const getInfo = (): Promise<any> =>
	getSoapFetch(SHELL_APP_ID)<SoapBody<{ rights: string }>, GetInfoResponse>('GetInfo', {
		_jsns: JSNS.account,
		rights: 'sendAs,sendAsDistList,viewFreeBusy,sendOnBehalfOf,sendOnBehalfOfDistList'
	}).then((res: GetInfoResponse) => {
		if (res) {
			const { id, name, version } = res;
			// TODO SAVE THIS DATA FOR NEXT CALLS
			return res;
		}
	});
