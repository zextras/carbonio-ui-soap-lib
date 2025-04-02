/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {noop} from "lodash";
import {describe, it, expect, vi, afterEach} from 'vitest';

import { ApiManager } from './ApiManager';

describe('ApiManager', () => {
	afterEach(() => ApiManager.destroyInstance());

	it('returns the same instance when getApiManager is called multiple times', () => {
		const instance1 = ApiManager.getApiManager();
		const instance2 = ApiManager.getApiManager();
		expect(instance1).toBe(instance2);
	});

	it('initializes sessionInfo as an empty object', () => {
		const apiManager = ApiManager.getApiManager();
		expect(apiManager.getSessionInfo()).toEqual({ legacyRefreshInfo: {} });
	});

	it('creates a new ApiManager instance if none exists', () => {
		delete window.carbonioApiManager;
		const apiManager = ApiManager.getApiManager();
		expect(apiManager).toBeInstanceOf(ApiManager);
	});

	it('does not overwrite existing ApiManager instance', () => {
		const existingInstance = ApiManager.getApiManager();
		window.carbonioApiManager = existingInstance;
		const apiManager = ApiManager.getApiManager();
		expect(apiManager).toBe(existingInstance);
	});

	it('sets sessionInfo', () => {
		const apiManager = ApiManager.getApiManager();
		const sessionInfo = { accountId: '123', accountName: 'testUser', legacyRefreshInfo: {} };
		apiManager.setSessionInfo(sessionInfo);
		expect(apiManager.getSessionInfo()).toEqual(sessionInfo);
	});

	it('resets polling timeout', () => {
		vi.spyOn(global, 'setTimeout');
		const apiManager = ApiManager.getApiManager();
		const pollingFunction = vi.fn();
		apiManager.resetPolling(pollingFunction, 1000);
		expect(setTimeout).toHaveBeenCalledWith(pollingFunction, 1000);
	});

	it('clearTimeout is not called if the timeoutHandler is not set', () => {
		vi.spyOn(global, 'clearTimeout');
		const apiManager = ApiManager.getApiManager();
		apiManager.stopPolling();

		expect(clearTimeout).not.toHaveBeenCalled();
	});

	it('clearTimeout is called if the timeoutHandler is set', () => {
		vi.spyOn(global, 'clearTimeout');
		const pollingTimeoutHandler: NodeJS.Timeout = setTimeout(noop, 5000);
		const apiManager = ApiManager.getApiManager();
		const sessionInfo = { pollingTimeoutHandler, legacyRefreshInfo: {} };
		apiManager.setSessionInfo(sessionInfo);
		apiManager.stopPolling();

		expect(clearTimeout).toHaveBeenCalledWith(pollingTimeoutHandler);
	});

});
