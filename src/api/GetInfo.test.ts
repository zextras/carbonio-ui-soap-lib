/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { describe, it, expect } from 'vitest';

import { getInfo } from './GetInfo';
import { JSNS } from '../constants';
import { createSoapApiInterceptor } from '../tests/CreateSoapApiInterceptor';

describe('FetchLocales', () => {
	it('should call the API correctly', async () => {
		const res = {
			id: faker.datatype.toString(),
			name: faker.datatype.toString(),
			version: faker.datatype.toString(),
			prefs: {
				_attrs: {
					zimbraPrefMailPollingInterval: '500'
				}
			}
		};

		const interceptor = createSoapApiInterceptor('GetInfo', res);
		const params = {
			rights: ['sendAs', 'sendOnBehalfOf'],
			sections: ['mbox', 'attrs']
		};

		await getInfo(params);
		const requestParams = await interceptor;
		expect(requestParams).toEqual({
			_jsns: JSNS.account,
			rights: params.rights.toString(),
			sections: params.sections.toString()
		});
	});
});
