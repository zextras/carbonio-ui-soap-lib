/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { JSNS } from '../constants';
import { soapFetch } from '../fetch/fetch-utils';
import { RawSoapResponse } from '../types/network';

type EndSessionRequest = {
	_jsns: typeof JSNS.account;
	logoff?: boolean;
	all?: boolean;
	excludeCurrent?: boolean;
	sessionId?: string;
};

type EndSessionResponse = Record<string, never>;

type EndSessionParams = {
	logoff?: boolean;
	all?: boolean;
	excludeCurrent?: boolean;
	sessionId?: string;
};

export const endSession = ({
	logoff,
	all,
	sessionId,
	excludeCurrent
}: EndSessionParams): Promise<RawSoapResponse<Record<string, never>>> =>
	soapFetch<EndSessionRequest, EndSessionResponse>('EndSession', {
		_jsns: JSNS.account,
		logoff,
		all,
		sessionId,
		excludeCurrent
	});
