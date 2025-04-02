/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { act, renderHook } from '@testing-library/react';
import { describe, vi, it, expect } from 'vitest';

import { ApiEvents } from './custumEventDispatcher';
import { useSync } from './useSync';

describe('useSync', () => {
	it('should initialize with an empty array', () => {
		const { result } = renderHook(() => useSync());
		expect(result.current).toEqual([]);
	});

	it('should update state when SyncUpdate event is dispatched', () => {
		const { result } = renderHook(() => useSync());
		const updates = [{ seq: 1, deleted: ['1', '2'] }];

		act(() => {
			window.dispatchEvent(new CustomEvent(ApiEvents.SyncUpdate, { detail: updates }));
		});

		expect(result.current).toEqual(updates);
	});

	it('should not update state if event detail is empty', () => {
		const { result } = renderHook(() => useSync());

		act(() => {
			window.dispatchEvent(new CustomEvent(ApiEvents.SyncUpdate, { detail: [] }));
		});

		expect(result.current).toEqual([]);
	});

	it('should remove event listener on unmount', () => {
		const { unmount } = renderHook(() => useSync());
		const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

		unmount();

		expect(removeEventListenerSpy).toHaveBeenCalledWith(ApiEvents.SyncUpdate, expect.any(Function));
		removeEventListenerSpy.mockRestore();
	});
});
