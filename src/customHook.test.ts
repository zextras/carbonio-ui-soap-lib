/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { renderHook } from '@testing-library/react-hooks';

import { testFn } from './customHook';

describe('testFn', () => {
	it('returns the initial state', () => {
		const { result } = renderHook(() => testFn());
		expect(result.current).toBe('test');
	});

	it('logs the correct message', () => {
		console.log = jest.fn();
		renderHook(() => testFn());
		expect(console.log).toHaveBeenCalledWith('test');
	});
});
