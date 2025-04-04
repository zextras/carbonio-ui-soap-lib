/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { faker } from '@faker-js/faker';
import { renderHook, act } from '@testing-library/react';
import { describe, vi, it, expect } from 'vitest';

import { ApiEvents } from './customEventDispatcher';
import { useInfoRefresh } from './useInfoRefresh';
import { ApiManager } from '../apiManager';
import type { SoapRefresh } from '../types/network';

describe('useInfoRefresh', () => {
	it('should initialize with info stored in the ApiManager', () => {
		const initialRefreshInfo: SoapRefresh = {
			seq: faker.number.int(),
			mbx: [{ s: faker.number.int() }]
		};
		vi.spyOn(ApiManager.getApiManager(), 'getSessionInfo').mockReturnValue({
			legacyRefreshInfo: initialRefreshInfo
		});

		const { result } = renderHook(() => useInfoRefresh());

		expect(result.current).toEqual(initialRefreshInfo);
	});

	it('should update state when InfoRefreshReceive event is dispatched', () => {
		const initialRefreshInfo: SoapRefresh = {
			seq: faker.number.int(),
			mbx: [{ s: faker.number.int() }]
		};
		const newRefreshInfo: SoapRefresh = {
			seq: faker.number.int(),
			mbx: [{ s: faker.number.int() }]
		};
		vi.spyOn(ApiManager.getApiManager(), 'getSessionInfo').mockReturnValue({
			legacyRefreshInfo: initialRefreshInfo
		});

		const { result } = renderHook(() => useInfoRefresh());

		act(() => {
			window.dispatchEvent(
				new CustomEvent(ApiEvents.InfoRefreshReceive, { detail: newRefreshInfo })
			);
		});

		expect(result.current).toEqual(newRefreshInfo);
	});

	it('should not update state if event detail is empty', () => {
		const initialRefreshInfo: SoapRefresh = {
			seq: faker.number.int(),
			mbx: [{ s: faker.number.int() }]
		};
		vi.spyOn(ApiManager.getApiManager(), 'getSessionInfo').mockReturnValue({
			legacyRefreshInfo: initialRefreshInfo
		});

		const { result } = renderHook(() => useInfoRefresh());

		act(() => {
			window.dispatchEvent(new CustomEvent(ApiEvents.InfoRefreshReceive, { detail: null }));
		});

		expect(result.current).toEqual(initialRefreshInfo);
	});

	it('should remove event listener on unmount', () => {
		const initialRefreshInfo: SoapRefresh = {
			seq: faker.number.int(),
			mbx: [{ s: faker.number.int() }]
		};
		vi.spyOn(ApiManager.getApiManager(), 'getSessionInfo').mockReturnValue({
			legacyRefreshInfo: initialRefreshInfo
		});

		const { unmount } = renderHook(() => useInfoRefresh());
		const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

		unmount();

		expect(removeEventListenerSpy).toHaveBeenCalledWith(
			ApiEvents.InfoRefreshReceive,
			expect.any(Function)
		);
		removeEventListenerSpy.mockRestore();
	});
});
