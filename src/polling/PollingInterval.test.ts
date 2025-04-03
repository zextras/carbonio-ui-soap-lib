/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, it } from 'vitest';

import { JSNS } from '../constants';
import { getPollingIntervalConfig, PollingIntervalConfig } from './PollingInterval';
import { ApiManager } from '../ApiManager';
import { NoOpResponse } from '../fetch/fetch';
import { RawSoapResponse } from '../types/network';

const cases = [
	{
		pollingPreference: 'invalid string',
		desc: 'should return 30000 if zimbraPrefMailPollingInterval is not a valid duration',
		longPolling: false,
		millisInterval: 30_000
	},
	{
		pollingPreference: '500',
		desc: 'long polling - should return an interval of 500ms and enable the long polling if polling configuration is "500" without a duration unit',
		longPolling: true,
		millisInterval: 500
	},
	{
		pollingPreference: '500ms',
		desc: 'long polling - should return 500 if zimbraPrefMailPollingInterval is "500ms"',
		longPolling: true,
		millisInterval: 500
	},
	{
		pollingPreference: '500s',
		desc: 'long polling - should return 500 if zimbraPrefMailPollingInterval is "500s"',
		longPolling: true,
		millisInterval: 500
	},
	{
		pollingPreference: '753',
		desc: 'should return the number * 1000 if zimbraPrefMailPollingInterval is set without a duration unit(so are handled as seconds)',
		longPolling: false,
		millisInterval: 753_000
	},
	{
		pollingPreference: '284ms',
		desc: 'should return the number if zimbraPrefMailPollingInterval is set with the duration unit ms (milliseconds)',
		longPolling: false,
		millisInterval: 284
	},
	{
		pollingPreference: '753s',
		desc: 'should return the number * 1000 if zimbraPrefMailPollingInterval is set with the duration unit s (seconds)',
		longPolling: false,
		millisInterval: 753_000
	},
	{
		pollingPreference: '50m',
		desc: 'should return the number * 60 * 1000 if zimbraPrefMailPollingInterval duration is set with the duration unit m (minutes)',
		longPolling: false,
		millisInterval: 60 * 50 * 1000
	},
	{
		pollingPreference: '2h',
		desc: 'should return the number * 60 * 60 * 1000 if zimbraPrefMailPollingInterval is set with the duration unit h (hours)',
		longPolling: false,
		millisInterval: 2 * 60 * 60 * 1000
	},
	{
		pollingPreference: '2d',
		desc: 'should return the number * 24 * 60 * 60 * 1000 if zimbraPrefMailPollingInterval is set with the duration unit d (days)',
		longPolling: false,
		millisInterval: 2 * 24 * 60 * 60 * 1000
	}
];

describe('PollingInterval', () => {
	describe('getPollingIntervalConfig', () => {
		it('should return an interval of 10000 ms and long polling disabled if the response is a NoOp with waitDisallowed set to true', () => {
			const noOpResponse = {
				Header: {
					context: {}
				},
				Body: {
					NoOpResponse: {
						_jsns: JSNS.mail,
						waitDisallowed: true
					}
				}
			} satisfies RawSoapResponse<{
				NoOpResponse: NoOpResponse;
			}>;
			const result = getPollingIntervalConfig(noOpResponse);
			expect(result).toEqual({
				longPolling: false,
				millisInterval: 10000
			} satisfies PollingIntervalConfig);
		});

		it('should return 60000 if the NoOp response includes a Fault', () => {
			const noOpResponse = {
				Header: {
					context: {}
				},
				Body: {
					Fault: {
						Code: { Value: '' },
						Detail: {
							Error: {
								Code: '',
								Trace: ''
							}
						},
						Reason: {
							Text: ''
						}
					},
					NoOpResponse: {
						_jsns: JSNS.mail,
						waitDisallowed: true
					}
				}
			} satisfies RawSoapResponse<{ NoOpResponse: NoOpResponse }>;
			const result = getPollingIntervalConfig(noOpResponse);
			expect(result).toEqual({
				longPolling: false,
				millisInterval: 60000
			} satisfies PollingIntervalConfig);
		});

		describe('without Fault nor waitDisallowed', () => {
			it.each(cases)('$desc', ({ pollingPreference, longPolling, millisInterval }) => {
				ApiManager.getApiManager().setSessionInfo({ pollingPreference });
				const response = {
					Header: {
						context: {}
					},
					Body: {}
				} satisfies RawSoapResponse<Record<string, unknown>>;
				const result = getPollingIntervalConfig(response);
				expect(result).toEqual({ longPolling, millisInterval } satisfies PollingIntervalConfig);
			});
		});
	});
});
