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
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { testFn } from './customHook';

describe('testFn', () => {
	it('returns the initial state', () => {
		const { result } = renderHook(() => testFn());
		expect(result.current).toBe('test');
	});

	it('logs the correct message', () => {
		console.log = vi.fn();
		renderHook(() => testFn());
		expect(console.log).toHaveBeenCalledWith('test');
	});
});
