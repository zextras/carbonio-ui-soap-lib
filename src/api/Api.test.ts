/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { describe, expect, it } from 'vitest';

import { api } from './Api';

describe('api', () => {
	it('should have a specific structure', () => {
		expect(api).toEqual(
			expect.objectContaining({
				getInfo: expect.any(Function),
				fetchLocales: expect.any(Function),
				endSession: expect.any(Function)
			})
		);
	});
});
