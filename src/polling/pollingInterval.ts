/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { ApiManager } from '../apiManager/apiManager';
import type { NoOpResponse } from '../fetch/fetch';
import type { RawSoapResponse } from '../types/network';

/**
 * Polling interval to use if the long polling delay
 * is not allowed for the user
 */
const POLLING_NOWAIT_INTERVAL = 10_000;

/**
 * Polling interval to use if a previous request failed
 * with a 500 error
 */
const POLLING_RETRY_INTERVAL = 60_000;

const POLLING_INVALID_DURATION = 30_000;

const LONG_POLLING_MARKER_VALUE = 500;

export type PollingIntervalConfig = {
	millisInterval: number;
	longPolling: boolean;
};

export const getPreferredPollingIntervalConfig = (): PollingIntervalConfig => {
	const pollingPref = ApiManager.getApiManager().getSessionInfo().pollingPreference;
	if (!pollingPref) {
		return {
			millisInterval: POLLING_INVALID_DURATION,
			longPolling: false
		};
	}

	const [value, durationUnit] = pollingPref.split(/([a-z]+)/g);
	if (!value) {
		return {
			millisInterval: POLLING_INVALID_DURATION,
			longPolling: false
		};
	}

	const pollingValue = parseInt(value, 10);
	if (Number.isNaN(pollingValue)) {
		return {
			millisInterval: POLLING_INVALID_DURATION,
			longPolling: false
		};
	}

	if (
		pollingValue === LONG_POLLING_MARKER_VALUE &&
		(durationUnit === undefined || durationUnit === 'ms' || durationUnit === 's')
	) {
		return {
			millisInterval: LONG_POLLING_MARKER_VALUE,
			longPolling: true
		};
	}
	switch (durationUnit) {
		case 'ms':
			return {
				millisInterval: pollingValue,
				longPolling: false
			};
		case undefined:
		case 's':
			return {
				millisInterval: pollingValue * 1000,
				longPolling: false
			};
		case 'm':
			return {
				millisInterval: pollingValue * 60 * 1000,
				longPolling: false
			};
		case 'h':
			return {
				millisInterval: pollingValue * 60 * 60 * 1000,
				longPolling: false
			};
		case 'd':
			return {
				millisInterval: pollingValue * 24 * 60 * 60 * 1000,
				longPolling: false
			};
		default:
			return {
				millisInterval: POLLING_INVALID_DURATION,
				longPolling: false
			};
	}
};

/**
 * Return the polling interval configuration for the next NoOp request.
 * The interval length depends on the user settings, but it can be
 * overridden by the server response/errors
 */
export const getPollingIntervalConfig = (
	res: RawSoapResponse<{
		NoOpResponse?: NoOpResponse;
	}>
): PollingIntervalConfig => {
	// Determine the polling interval config based on the server response
	const waitDisallowed =
		res.Body && !('Fault' in res.Body) && res.Body.NoOpResponse?.waitDisallowed;
	const fault = res.Body && 'Fault' in res.Body && res.Body.Fault;
	if (fault) {
		return {
			millisInterval: POLLING_RETRY_INTERVAL,
			longPolling: false
		};
	}
	if (waitDisallowed) {
		return {
			millisInterval: POLLING_NOWAIT_INTERVAL,
			longPolling: false
		};
	}

	// Determine the polling interval config based on user settings
	return getPreferredPollingIntervalConfig();
};
