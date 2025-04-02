/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { faker } from '@faker-js/faker';
import { times } from 'lodash';
import { describe, it, expect, vi } from 'vitest';

import {
	dispatchUserQuotaChangeEvent,
	dispatchSyncUpdateEvent,
	dispatchInfoRefreshReceiveEvent,
	dispatchAuthErrorEvent,
	ApiEvents
} from './custumEventDispatcher';
import {SoapContext, SoapRefresh} from '../types/network';

describe('CustomEventDispatcher', () => {
	it('dispatchUserQuotaChangeEvent should dispatch the correct event with quota', () => {
		const quota = faker.number.int();
		const spy = vi.spyOn(window, 'dispatchEvent');
		dispatchUserQuotaChangeEvent(quota);
		expect(spy).toHaveBeenCalledWith(
			new CustomEvent(ApiEvents.UserQuotaChange, { detail: { quota } })
		);
		spy.mockRestore();
	});

	it('dispatchSyncUpdateEvent should dispatch the correct event with notifications', () => {
		const notifications: SoapContext['notify'] = [
			{
				seq: faker.number.int(),
				deleted: times(10, () => faker.number.int().toString())
			}
		];
		const spy = vi.spyOn(window, 'dispatchEvent');
		dispatchSyncUpdateEvent(notifications);
		expect(spy).toHaveBeenCalledWith(
			new CustomEvent(ApiEvents.SyncUpdate, { detail: notifications })
		);
		spy.mockRestore();
	});

	it('dispatchInfoRefreshReceiveEvent should dispatch the correct event with refresh data', () => {
		const refresh: SoapRefresh = {
			seq: faker.number.int(),
			mbx: [{ s: faker.number.int() }] };
		const spy = vi.spyOn(window, 'dispatchEvent');
		dispatchInfoRefreshReceiveEvent(refresh);
		expect(spy).toHaveBeenCalledWith(
			new CustomEvent(ApiEvents.InfoRefreshReceive, { detail: refresh })
		);
		spy.mockRestore();
	});

	it('dispatchAuthErrorEvent should dispatch the correct event with error', () => {
		const error = 'NOT_AUTHENTICATED';
		const spy = vi.spyOn(window, 'dispatchEvent');
		dispatchAuthErrorEvent(error);
		expect(spy).toHaveBeenCalledWith(new CustomEvent(ApiEvents.AuthError, { detail: { error } }));
		spy.mockRestore();
	});
});
