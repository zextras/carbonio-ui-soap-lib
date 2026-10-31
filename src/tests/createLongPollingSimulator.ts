/*
 * SPDX-FileCopyrightText: 2026 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { http, HttpResponse } from 'msw';

import { JSNS } from '../constants';
import server from './mocks/server';
import type { NoOpRequest, NoOpResponse } from '../fetch/fetch';
import type { RawSoapContext, RawSuccessSoapResponse, SoapRequest } from '../types/network';

type SentNoOp = { at: number; blocking: boolean };

type LongPollingSimulatorOptions = {
	/** Time after which the server answers a pending blocking NoOp (zimbra_noop_default_timeout) */
	serverTimeout?: number | 'never';
	/**
	 * How a blocking NoOp ends when a newer one replaces it: with a waitDisallowed response, or
	 * with a network failure, as when its connection is dead
	 */
	replacedNoOpOutcome?: 'waitDisallowed' | 'networkError';
};

type LongPollingSimulator = {
	/** The NoOp requests received, with the seconds elapsed since the simulator was created */
	sentNoOps: Array<SentNoOp>;
	/** The seconds at which a pending blocking NoOp was answered with waitDisallowed */
	waitDisallowedAt: Array<number>;
	/** A new mail arrives: the server answers the pending blocking NoOp with a notification */
	newMail: () => void;
	/** A blocking NoOp of another session of the same account cancels the pending one */
	cancelFromAnotherSession: () => void;
};

const noOpResponse = (
	body: Pick<NoOpResponse, 'waitDisallowed'> = {},
	context: RawSoapContext = {}
): Response =>
	HttpResponse.json<RawSuccessSoapResponse<{ NoOpResponse: NoOpResponse }>>({
		Body: { NoOpResponse: { _jsns: JSNS.mail, ...body } },
		Header: { context }
	});

/**
 * Simulate how the mailbox server handles the NoOp requests with limitToOneBlocked:
 * - a NoOp without wait returns immediately, and does not affect the pending one
 * - a blocking NoOp returns with the next notification, or after the server timeout
 * - the server keeps a single blocking NoOp per account: a new one cancels the pending one
 */
export const createLongPollingSimulator = ({
	serverTimeout = 300_000,
	replacedNoOpOutcome = 'waitDisallowed'
}: LongPollingSimulatorOptions = {}): LongPollingSimulator => {
	const startedAt = Date.now();
	const elapsedSeconds = (): number => (Date.now() - startedAt) / 1000;
	const sentNoOps: Array<SentNoOp> = [];
	const waitDisallowedAt: Array<number> = [];
	let answerPendingNoOp: ((response: Response) => void) | undefined;

	const cancelPendingNoOp = (): void => {
		if (answerPendingNoOp) {
			waitDisallowedAt.push(elapsedSeconds());
			answerPendingNoOp(noOpResponse({ waitDisallowed: true }));
		}
	};

	server.use(
		http.post<never, SoapRequest<NoOpRequest>>('/service/soap/NoOpRequest', async ({ request }) => {
			const { Body } = await request.json();
			const blocking = Body.NoOpRequest?.wait === 1;
			sentNoOps.push({ at: elapsedSeconds(), blocking });
			if (!blocking) {
				return noOpResponse();
			}
			if (replacedNoOpOutcome === 'waitDisallowed') {
				cancelPendingNoOp();
			} else {
				answerPendingNoOp?.(HttpResponse.error());
			}
			return new Promise<Response>((resolve) => {
				let timeout: ReturnType<typeof setTimeout> | undefined;
				const answer = (response: Response): void => {
					clearTimeout(timeout);
					answerPendingNoOp = undefined;
					resolve(response);
				};
				if (serverTimeout !== 'never') {
					timeout = setTimeout(() => answer(noOpResponse()), serverTimeout);
				}
				answerPendingNoOp = answer;
			});
		})
	);

	return {
		sentNoOps,
		waitDisallowedAt,
		newMail: (): void => answerPendingNoOp?.(noOpResponse({}, { notify: [{ seq: 1 }] })),
		cancelFromAnotherSession: cancelPendingNoOp
	};
};
