/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

type ApiManagerSessionInfo = {
	accountId?: string;
	accountName?: string;
	sessionId?: string;
	carbonioVersion?: string;
};

export class ApiManager {
	static getApiManager(): ApiManager {
		if (!window.carbonioApiManager) {
			window.carbonioApiManager = new ApiManager();
		}
		return window.carbonioApiManager;
	}

	sessionInfo: ApiManagerSessionInfo;

	constructor() {
		this.sessionInfo = {};
		// TODO INIT POLLING
	}
}
