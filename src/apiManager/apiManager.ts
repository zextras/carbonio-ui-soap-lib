/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { SoapRefresh } from '../types/network';

type ApiManagerSessionInfo = {
	accountId?: string;
	accountName?: string;
	session?: { id: number; _content: number };
	carbonioVersion?: string;
	notificationsSequence?: number;
	pollingPreference?: string;
	pollingTimeoutHandler?: NodeJS.Timeout;
	/**
	 * The blocking NoOp the polling is waiting for. Every module bundles its own copy of this
	 * library and they all share the instance created by the shell: keeping the state here, behind
	 * the existing getSessionInfo and setSessionInfo, shares it among all the copies and works on
	 * instances created by older versions, which would lack a new method
	 */
	pendingBlockingNoOp?: { sentAt: number };
	/**
	 * TODO remove ASAP
	 * @deprecated
	 */
	legacyRefreshInfo: SoapRefresh;
};

export class ApiManager {
	static getApiManager(): ApiManager {
		if (!window.carbonioApiManager) {
			window.carbonioApiManager = new ApiManager();
		}
		return window.carbonioApiManager;
	}

	private sessionInfo: ApiManagerSessionInfo;

	getSessionInfo(): ApiManagerSessionInfo {
		return this.sessionInfo;
	}

	setSessionInfo(sessionInfo: Partial<ApiManagerSessionInfo>): void {
		this.sessionInfo = { ...this.sessionInfo, ...sessionInfo };
	}

	setPollingPreference(pollingPreference: string): void {
		this.sessionInfo.pollingPreference = pollingPreference;
	}

	public resetPolling(pollingFunction: () => void, millisTimeout: number): void {
		if (this.sessionInfo.pollingTimeoutHandler) {
			clearTimeout(this.sessionInfo.pollingTimeoutHandler);
		}
		this.sessionInfo.pollingTimeoutHandler = setTimeout(pollingFunction, millisTimeout);
	}

	public stopPolling(): void {
		if (!this.sessionInfo.pollingTimeoutHandler) {
			return;
		}
		clearTimeout(this.sessionInfo.pollingTimeoutHandler);
		this.sessionInfo.pollingTimeoutHandler = undefined;
	}

	private constructor() {
		this.sessionInfo = {
			legacyRefreshInfo: {}
		};
	}
}
