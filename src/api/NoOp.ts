/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { JSNS } from '../constants';
import { soapFetchV2 } from '../fetch/fetch';
import type { SoapBody } from '../types/network';

export type NoOpRequest = SoapBody<{
	limitToOneBlocked?: 0 | 1;
	wait?: 0 | 1;
}>;

export type NoOpResponse = SoapBody<{
	waitDisallowed?: boolean;
}>;

type NoOpParams = {
	limitToOneBlocked?: boolean;
	wait?: boolean;
};

export const noOp = ({ limitToOneBlocked, wait }: NoOpParams): void => {
	const requestsParams: NoOpRequest = {
		_jsns: JSNS.mail,
		...(limitToOneBlocked !== undefined
			? { limitToOneBlocked: limitToOneBlocked ? 1 : 0 }
			: undefined),
		...(wait !== undefined ? { wait: wait ? 1 : 0 } : undefined)
	};
	soapFetchV2<NoOpRequest, NoOpResponse>('NoOp', requestsParams);
};
