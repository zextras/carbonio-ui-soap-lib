/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class PollingManager {
	/**
	 * Polling interval to use if the long polling delay
	 * is not allowed for the user
	 */
	static POLLING_NOWAIT_INTERVAL = 10_000;

	/**
	 * Polling interval to use if a previous request failed
	 * with a 500 error
	 */
	static POLLING_RETRY_INTERVAL = 60_000;

	static POLLING_INVALID_DURATION = 30_000;

	static LONG_POLLING_MARKER_VALUE = 500;

	static POLLING_DEFAULT_VALUE = 60_000;

	/**
	 * Whether the polling is long polling or not
	 * @private
	 */
	private isLongPolling: boolean = false;

	/**
	 * Polling interval in milliseconds
	 * @private
	 */
	private interval: number = PollingManager.POLLING_DEFAULT_VALUE;

	/**
	 * Handle for the timeout
	 * @private
	 */
	private timeoutHandle?: NodeJS.Timeout;

	public getLongPolling(): boolean {
		return this.isLongPolling;
	}

	public getInterval(): number {
		return this.interval;
	}

	/**
	 * Parse the polling configuration, set the interval time and the long polling flag
	 * @param intervalConfig
	 * @private
	 */
	public setConfiguration(intervalConfig: string): void {
		const [value, durationUnit] = intervalConfig.split(/([a-z]+)/g);
		if (!value) {
			this.interval = PollingManager.POLLING_DEFAULT_VALUE;
			this.isLongPolling = false;
			return;
		}

		const pollingValue = parseInt(value, 10);
		if (Number.isNaN(pollingValue)) {
			this.interval = PollingManager.POLLING_INVALID_DURATION;
			this.isLongPolling = false;
			return;
		}

		if (
			pollingValue === PollingManager.LONG_POLLING_MARKER_VALUE &&
			(durationUnit === undefined || durationUnit === 'ms' || durationUnit === 's')
		) {
			this.interval = PollingManager.LONG_POLLING_MARKER_VALUE;
			this.isLongPolling = true;
			return;
		}
		switch (durationUnit) {
			case 'ms':
				this.interval = pollingValue;
				break;
			case undefined:
			case 's':
				this.interval = pollingValue * 1000;
				break;
			case 'm':
				this.interval = pollingValue * 60 * 1000;
				break;
			case 'h':
				this.interval = pollingValue * 60 * 60 * 1000;
				break;
			case 'd':
				this.interval = pollingValue * 24 * 60 * 60 * 1000;
				break;
			default:
				this.interval = PollingManager.POLLING_INVALID_DURATION;
		}

		this.isLongPolling = false;
	}

	public startPolling(): void {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}
		this.timeoutHandle = setTimeout(() => {
			// Do something
		}, this.interval);
	}

	public stopPolling(): void {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}
	}
}
