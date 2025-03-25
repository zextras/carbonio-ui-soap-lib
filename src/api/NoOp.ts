/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { JSNS } from '../constants';
import { soapFetch } from '../fetch/fetch-utils';
import type { SoapBody } from '../types/network';

export type NoOpRequest = SoapBody<{
	limitToOneBlocked?: boolean;
	wait?: boolean;
}>;

export type NoOpResponse = SoapBody<{
	waitDisallowed?: boolean;
}>;

type NoOpParams = {
	limitToOneBlocked?: boolean;
	wait?: boolean;
};

export const noOp = ({ limitToOneBlocked, wait }: NoOpParams): void => {
	soapFetch<NoOpRequest, NoOpResponse>('NoOp', {
		_jsns: JSNS.mail,
		limitToOneBlocked,
		wait
	});
};
