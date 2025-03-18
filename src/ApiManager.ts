/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ApiManager {
		static getApiManager() {
				if (!window.carbonioApiManager) {
					window.carbonioApiManager = new ApiManager();
				}
				return window.carbonioApiManager;
		}

		carbonioVersion: string;

		accountId: string;

		accountName: string;
		
		constructor() {
			// TODO INIT POLLING
			this.carbonioVersion = '';
			this.accountId = '';
			this.accountName = '';
		}

}