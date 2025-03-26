/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApiManager } from '../ApiManager';
import { JSNS } from '../constants';
import { legacySoapFetch } from '../fetch/fetch';
import { GetInfoResponse } from '../types/network';
import { SoapBody } from '../types/network/soap';
import { ValueOf } from '../types/typeUtils';

export const GET_INFO_RIGHTS = {
	sendAs: 'sendAs',
	sendAsDistList: 'sendAsDistList',
	viewFreeBusy: 'viewFreeBusy',
	sendOnBehalfOf: 'sendOnBehalfOf',
	sendOnBehalfOfDistList: 'sendOnBehalfOfDistList'
};

export const GET_INFO_SECTIONS = {
	mbox: 'mbox',
	prefs: 'prefs',
	attrs: 'attrs',
	zimlets: 'zimlets',
	props: 'props',
	idents: 'idents',
	sigs: 'sigs',
	dsrcs: 'dsrcs',
	children: 'children'
};

type GetInfoParams = {
	rights?: Array<ValueOf<typeof GET_INFO_RIGHTS>>;
	sections?: Array<ValueOf<typeof GET_INFO_SECTIONS>>;
};

type GetInfoRequest = {
	rights?: string;
	sections?: string;
};

export const getInfo = ({ rights, sections }: GetInfoParams = {}): Promise<GetInfoResponse> => {
	const rightsList = rights && rights.join(',');
	const sectionsList = sections && sections.join(',');

	return legacySoapFetch<SoapBody<GetInfoRequest>, GetInfoResponse>('GetInfo', {
		_jsns: JSNS.account,
		rights: rightsList,
		sections: sectionsList
	}).then((res: GetInfoResponse) => {
		if (res) {
			const {
				id,
				name,
				version,
				prefs: {
					_attrs: { zimbraPrefMailPollingInterval: pollingInterval }
				}
			} = res;
			ApiManager.getApiManager().setSessionInfo({
				accountId: id,
				accountName: name,
				carbonioVersion: version
			});
			if (pollingInterval) {
				ApiManager.getApiManager().setPollingInterval(pollingInterval);
			}
		}

		return res;
	});
};
