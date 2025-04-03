/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { faker } from '@faker-js/faker';
import { describe, it, expect } from 'vitest';

import { endSession } from './EndSession';
import { JSNS } from '../constants';
import { createSoapApiInterceptor } from '../tests/CreateSoapApiInterceptor';

describe('endSession', () => {
	it('should call the API with correct parameters when all options are provided', async () => {
		const interceptor = createSoapApiInterceptor('EndSession');

		const params = {
			logoff: faker.datatype.boolean(),
			all: faker.datatype.boolean(),
			sessionId: faker.number.int().toString(),
			excludeCurrent: faker.datatype.boolean()
		};
		endSession(params);
		const requestParams = await interceptor;
		expect(requestParams).toEqual({
			_jsns: JSNS.account,
			logoff: params.logoff,
			all: params.all,
			sessionId: params.sessionId,
			excludeCurrent: params.excludeCurrent
		});
	});

	it('should call soapFetch with correct parameters when only sessionId is provided', async () => {
		const params = { sessionId: '123' };
		await endSession(params);
		expect(soapFetch).toHaveBeenCalledWith('EndSession', {
			_jsns: JSNS.account,
			logoff: undefined,
			all: undefined,
			sessionId: '123',
			excludeCurrent: undefined
		});
	});
});
