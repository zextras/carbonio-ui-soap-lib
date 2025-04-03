/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Functions, classes and hooks
export * from './api/Api';
export * from './fetch/fetch';
export * from './fetch/fetch-utils';
export * from './customEvent/custumEventDispatcher';
export { ApiManager } from './ApiManager';
export { useSync } from './customEvent/useSync';
export { useInfoRefresh } from './customEvent/useInfoRefresh';

// Export types
export type * from './types/account';
export type * from './types/network/soap';
export type * from './types/network/entities';
export type * from './types/network/index';
export type * from './types/tags';

// Export constants
export { GET_INFO_RIGHTS, GET_INFO_SECTIONS } from './api/GetInfo';
