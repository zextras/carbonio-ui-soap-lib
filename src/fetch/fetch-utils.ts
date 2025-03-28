/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { userAgent } from './user-agent';
// import { useAccountStore } from '../store/account';
// import { useNetworkStore } from '../store/network';
// import type { Account } from '../types/account';
import { ApiManager } from '../ApiManager';
import { JSNS } from '../constants';
import type { RawSoapResponse } from '../types/network';

const getFinalAccount = (account?: string): { by: string; _content: string } | undefined => {
	const sessionInfo = ApiManager.getApiManager().getSessionInfo();

	if (account) {
		return {
			by: 'name',
			_content: account
		};
	}
	if (sessionInfo.accountName) {
		return {
			by: 'name',
			_content: sessionInfo.accountName
		};
	}
	if (sessionInfo.accountId) {
		return {
			by: 'id',
			_content: sessionInfo.accountId
		};
	}
	return undefined;
};

export const soapFetch = async <Request, Response extends Record<string, unknown>>(
	api: string,
	body: Request,
	account?: string,
	signal?: AbortSignal
): Promise<RawSoapResponse<Response>> => {
	const { carbonioVersion, session, notificationsSequence } =
		ApiManager.getApiManager().getSessionInfo();

	const res = await fetch(`/service/soap/${api}Request`, {
		signal,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			Body: {
				[`${api}Request`]: body
			},
			Header: {
				context: {
					_jsns: JSNS.all,
					notify: notificationsSequence
						? {
								seq: notificationsSequence
							}
						: undefined,
					session: session ?? {},
					account: getFinalAccount(account),
					userAgent: {
						name: userAgent,
						version: carbonioVersion
					}
				}
			}
		})
	});
	return res.json();
};
