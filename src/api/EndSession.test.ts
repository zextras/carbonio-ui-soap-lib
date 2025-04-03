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

		await endSession(params);
		const requestParams = await interceptor;
		expect(requestParams).toEqual({
			_jsns: JSNS.account,
			logoff: params.logoff,
			all: params.all,
			sessionId: params.sessionId,
			excludeCurrent: params.excludeCurrent
		});
	});

	const cases = [
		{ logoff: faker.datatype.boolean() },
		{ all: faker.datatype.boolean() },
		{ sessionId: faker.number.int().toString() },
		{ excludeCurrent: faker.datatype.boolean() }
	];

	it.each(cases)('should call soapFetch with only %s provided', async (params) => {
		const interceptor = createSoapApiInterceptor('EndSession');
		await endSession(params);
		const requestParams = await interceptor;
		expect(requestParams).toEqual({
			_jsns: JSNS.account,
			...params
		});
	});
});
