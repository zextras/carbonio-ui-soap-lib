/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {describe, it, expect, vi} from 'vitest';

import { ApiManager } from './ApiManager';

describe('ApiManager', () => {
	it('returns the same instance when getApiManager is called multiple times', () => {
		const instance1 = ApiManager.getApiManager();
		const instance2 = ApiManager.getApiManager();
		expect(instance1).toBe(instance2);
	});

	it('initializes sessionInfo as an empty object', () => {
		const apiManager = new ApiManager();
		expect(apiManager.getSessionInfo()).toEqual({ legacyRefreshInfo: {} });
	});

	it('creates a new ApiManager instance if none exists', () => {
		delete window.carbonioApiManager;
		const apiManager = ApiManager.getApiManager();
		expect(apiManager).toBeInstanceOf(ApiManager);
	});

	it('does not overwrite existing ApiManager instance', () => {
		const existingInstance = new ApiManager();
		window.carbonioApiManager = existingInstance;
		const apiManager = ApiManager.getApiManager();
		expect(apiManager).toBe(existingInstance);
	});

	it('sets sessionInfo', () => {
		const apiManager = new ApiManager();
		const sessionInfo = { accountId: '123', accountName: 'testUser', legacyRefreshInfo: {} };
		apiManager.setSessionInfo(sessionInfo);
		expect(apiManager.getSessionInfo()).toEqual(sessionInfo);
	});

	it('resets polling timeout', () => {
		vi.spyOn(global, 'setTimeout');
		const apiManager = new ApiManager();
		const pollingFunction = vi.fn();
		apiManager.resetPolling(pollingFunction, 1000);
		expect(setTimeout).toHaveBeenCalledWith(pollingFunction, 1000);
	});

	it('stops polling is called', () => {
		vi.spyOn(global, 'clearTimeout');
		const apiManager = new ApiManager();
		apiManager.stopPolling();

		expect(clearTimeout).not.toHaveBeenCalled();
	});

	it('stops polling is not called if pollingTimeoutHandler is not set', () => {
		vi.spyOn(global, 'clearTimeout');
		const pollingTimeoutHandler: NodeJS.Timeout = () => setTimeout(vi.fn(), 5000);
		const apiManager = new ApiManager();
		const sessionInfo = { pollingTimeoutHandler, legacyRefreshInfo: {} };
		apiManager.setSessionInfo(sessionInfo);
		apiManager.stopPolling();

		expect(clearTimeout).toHaveBeenCalledWith(pollingTimeoutHandler);
	});

});
