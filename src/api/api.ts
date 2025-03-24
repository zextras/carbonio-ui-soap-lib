/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { endSession } from './endSession';
import { fetchLocales } from './fetch-locales';
import { getInfo } from './get-info';

export const api = {
	getInfo,
	fetchLocales,
	endSession
};
