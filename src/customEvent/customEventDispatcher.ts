/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { SoapContext } from '../types/network';

export const ApiEvents = {
	UserQuotaChange: `carbonioUserQuotaEventChange`,
	SyncUpdate: 'carbonioSyncUpdate',
	InfoRefreshReceive: 'carbonioInfoRefreshReceive',
	AuthError: 'carbonioAuthError'
} as const;

export type UserQuotaChangeEvent = {
	name: typeof ApiEvents.UserQuotaChange;
	payload: {
		quota: number;
	};
};

export type SyncUpdateEvent = {
	name: typeof ApiEvents.SyncUpdate;
	payload: SoapContext['notify'];
};

export type InfoRefreshReceiveEvent = {
	name: typeof ApiEvents.InfoRefreshReceive;
	payload: SoapContext['refresh'];
};

export type AuthErrorEvent = {
	name: typeof ApiEvents.AuthError;
	payload?: never;
};

type ApiEvent = UserQuotaChangeEvent | SyncUpdateEvent | AuthErrorEvent | InfoRefreshReceiveEvent;

const dispatchCustomEvent = (event: ApiEvent): void => {
	window.dispatchEvent(new CustomEvent(event.name, { detail: event.payload }));
};

export const dispatchUserQuotaChangeEvent = (quota: number): void => {
	dispatchCustomEvent({ name: ApiEvents.UserQuotaChange, payload: { quota } });
};

export const dispatchSyncUpdateEvent = (notifications: SoapContext['notify']): void => {
	dispatchCustomEvent({ name: ApiEvents.SyncUpdate, payload: notifications });
};

export const dispatchInfoRefreshReceiveEvent = (refresh: SoapContext['refresh']): void => {
	dispatchCustomEvent({ name: ApiEvents.InfoRefreshReceive, payload: refresh });
};

export const dispatchAuthErrorEvent = (): void => {
	dispatchCustomEvent({ name: ApiEvents.AuthError });
};
