/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {describe, expect, it} from 'vitest';

import {fetchLocales} from "./FetchLocales";
import {JSNS} from "../constants";
import {createSoapApiInterceptor} from "../tests/CreateSoapApiInterceptor";

describe('FetchLocales', () => {
	it('should call the API correctly', async () => {
		const interceptor = createSoapApiInterceptor('GetAvailableLocales');

		await fetchLocales();
		const requestParams = await interceptor;
		expect(requestParams).toEqual({
			_jsns: JSNS.account
		});
	});
});
