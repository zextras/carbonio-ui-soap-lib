/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PollingManager } from './polling/PollingManager';

type ApiManagerSessionInfo = {
	accountId?: string;
	accountName?: string;
	session?: { id: number; _content: number };
	carbonioVersion?: string;
	notificationsSequence?: number;
};

export class ApiManager {
	static getApiManager(): ApiManager {
		if (!window.carbonioApiManager) {
			window.carbonioApiManager = new ApiManager();
		}
		return window.carbonioApiManager;
	}

	private sessionInfo: ApiManagerSessionInfo;

	private pollingManager: PollingManager | undefined;

	getSessionInfo(): ApiManagerSessionInfo {
		return this.sessionInfo;
	}

	setSessionInfo(sessionInfo: Partial<ApiManagerSessionInfo>): void {
		this.sessionInfo = { ...this.sessionInfo, ...sessionInfo };
	}

	setPollingInterval(intervalConfig: string): void {
		if (!this.pollingManager) {
			this.pollingManager = new PollingManager();
		}

		this.pollingManager.setConfiguration(intervalConfig);
		this.pollingManager.startPolling();
	}

	resetPolling(): void {
		this.pollingManager && this.pollingManager.startPolling();
	}

	stopPolling(): void {
		this.pollingManager && this.pollingManager.stopPolling();
	}

	constructor() {
		this.sessionInfo = {};
	}
}
