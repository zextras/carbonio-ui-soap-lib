/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { Mock, vi } from 'vitest';

export const createEventInterceptor = (eventName: string): Mock<(e: Event) => void> => {
	const interceptor = vi.fn<(e: Event) => void>();
	window.addEventListener(eventName, interceptor);
	return interceptor;
};

export const removeEventInterceptor = (eventName: string, interceptor: (e: Event) => void): void => {
	window.removeEventListener(eventName, interceptor);
};
