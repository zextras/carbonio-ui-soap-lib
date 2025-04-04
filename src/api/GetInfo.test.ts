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
import { describe, it, expect, afterEach, vi } from 'vitest';

import { getInfo } from './GetInfo';
import { ApiManager } from '../ApiManager';
import { JSNS } from '../constants';
import { ApiEvents } from '../customEvent/custumEventDispatcher';
import { createSoapApiInterceptor } from '../tests/CreateSoapApiInterceptor';
import { RawSoapContext } from '../types/network';

describe('GetInfo', () => {
	afterEach((): void => {
		// Reset the singleton
		window.carbonioApiManager = undefined;
	});

	it('should call the API correctly', async () => {
		const res = {
			id: faker.string.uuid(),
			name: faker.word.noun(1),
			version: faker.system.semver(),
			prefs: {
				_attrs: { zimbraPrefMailPollingInterval: '500' }
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

	it('should set the session infos if set in the response', async () => {
		const res = {
			id: faker.string.uuid(),
			name: faker.word.noun(1),
			version: faker.system.semver(),
			prefs: {
				_attrs: { zimbraPrefMailPollingInterval: '500' }
			}
		};
		createSoapApiInterceptor('GetInfo', res);

		await getInfo();

		expect(ApiManager.getApiManager().getSessionInfo()).toMatchObject({
			accountId: res.id,
			accountName: res.name,
			carbonioVersion: res.version
		});
	});

	it('should set the polling interval if set in the response', async () => {
		ApiManager.getApiManager().setPollingPreference('120s');
		const res = {
			id: faker.string.uuid(),
			name: faker.word.noun(1),
			version: faker.system.semver(),
			prefs: {
				_attrs: {
					zimbraPrefMailPollingInterval: '500'
				}
			}
		};
		createSoapApiInterceptor('GetInfo', res);

		await getInfo();

		expect(ApiManager.getApiManager().getSessionInfo().pollingPreference).toEqual('500');
	});

	it('should trigger the carbonioInfoRefreshReceive event if the refresh section is set in the response', async () => {
		const body = {
			id: faker.string.uuid(),
			name: faker.word.noun(1),
			version: faker.system.semver(),
			prefs: {
				_attrs: { zimbraPrefMailPollingInterval: '500' }
			}
		};
		const context: RawSoapContext = {
			refresh: {
				mbx: [{ s: faker.number.int() }]
			}
		};

		const spy = vi.spyOn(window, 'dispatchEvent');
		createSoapApiInterceptor('GetInfo', body, context);

		await getInfo();

		expect(spy).toHaveBeenCalledWith(
			new CustomEvent(ApiEvents.InfoRefreshReceive, { detail: context.refresh })
		);
		spy.mockRestore();
	});
});
