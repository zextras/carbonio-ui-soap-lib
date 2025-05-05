/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
export type StringOfLength<Min, Max = Min> = string & {
	min: Min;
	max: Max;
	readonly StringOfLength: unique symbol; // this is the phantom type
};

export type ValueOf<T> = T[keyof T];
