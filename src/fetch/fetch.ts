/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { soapFetch } from './fetchUtils';
import { userAgent } from './userAgent';
import { ApiManager } from '../apiManager/apiManager';
import { JSNS } from '../constants';
import {
	dispatchAuthErrorEvent,
	dispatchSyncUpdateEvent,
	dispatchInfoRefreshReceiveEvent,
	dispatchUserQuotaChangeEvent
} from '../customEvent/customEventDispatcher';
import {
	BLOCKING_NOOP_MAX_DURATION,
	getPollingIntervalConfig,
	POLLING_RETRY_INTERVAL
} from '../polling/pollingInterval';
import {
	ErrorSoapBodyResponse,
	ErrorSoapResponse,
	RawSoapContext,
	RawSoapResponse,
	type SoapBody,
	SoapContext,
	SoapNotify
} from '../types/network';

export type NoOpRequest = SoapBody<{
	limitToOneBlocked?: 0 | 1;
	wait?: 0 | 1;
}>;

export type NoOpResponse = SoapBody<{
	waitDisallowed?: boolean;
}>;

type NoOpParams = {
	limitToOneBlocked?: boolean;
	wait?: boolean;
};

export const noOp = ({ limitToOneBlocked, wait }: NoOpParams = {}): void => {
	const requestsParams: NoOpRequest = {
		_jsns: JSNS.mail,
		...(limitToOneBlocked !== undefined
			? { limitToOneBlocked: limitToOneBlocked ? 1 : 0 }
			: undefined),
		...(wait !== undefined ? { wait: wait ? 1 : 0 } : undefined)
	};
	// Track the blocking NoOp, so that the responses received while it is pending do not schedule
	// another one (see handleResponseV2)
	const blockingNoOp = wait ? { sentAt: Date.now() } : undefined;
	if (blockingNoOp) {
		ApiManager.getApiManager().setSessionInfo({ pendingBlockingNoOp: blockingNoOp });
	}
	// Release the record only if it is still this NoOp's one: after a lost NoOp another one may
	// have replaced it
	const releaseBlockingNoOp = (): void => {
		const { pendingBlockingNoOp } = ApiManager.getApiManager().getSessionInfo();
		if (blockingNoOp && pendingBlockingNoOp === blockingNoOp) {
			ApiManager.getApiManager().setSessionInfo({ pendingBlockingNoOp: undefined });
		}
	};
	soapFetch<NoOpRequest, NoOpResponse>('NoOp', requestsParams)
		.then((res) => {
			releaseBlockingNoOp();
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			handleResponseV2(res);
		})
		.catch(() => {
			releaseBlockingNoOp();
			// A network failure or a non-JSON response (e.g. the HTML error page of a proxy) never
			// reaches handleResponseV2, which is the only place scheduling the next NoOp.
			// Without this retry the polling would stop until another request succeeds
			ApiManager.getApiManager().resetPolling(() => noOp(), POLLING_RETRY_INTERVAL);
		});
};

export const shortPollingNoOp = (): void => {
	noOp();
};

export const longPollingNoOp = (): void => {
	noOp({ wait: true, limitToOneBlocked: true });
};

const composeAccountTag = (otherAccount?: string): string => {
	if (otherAccount) {
		return `<account by="name">${otherAccount}</account>`;
	}

	const sessionInfo = ApiManager.getApiManager().getSessionInfo();
	if (sessionInfo.accountName) {
		return `<account by="name">${sessionInfo.accountName}</account>`;
	}
	if (sessionInfo.accountId) {
		return `<account by="id">${sessionInfo.accountId}</account>`;
	}
	return '';
};

const composeSessionTag = (): string => {
	const sessionInfo = ApiManager.getApiManager().getSessionInfo();
	if (sessionInfo.session) {
		return `<session id="${sessionInfo.session.id}"/>`;
	}
	return '';
};

const normalizeContext = ({ notify: rawNotify, ...context }: RawSoapContext): SoapContext => {
	const normalizedContext: SoapContext = { ...context, notify: [] };
	if (rawNotify) {
		normalizedContext.notify = rawNotify.map<SoapNotify>((notify) => ({
			...notify,
			deleted: notify.deleted?.id?.split(',') ?? []
		}));
	}
	return normalizedContext;
};

const handleFaultResponse = <R extends Record<string, unknown>>(res: RawSoapResponse<R>): void => {
	if (!('Fault' in res.Body)) {
		return;
	}

	if (
		['service.AUTH_REQUIRED', 'service.AUTH_EXPIRED'].find(
			(code) => code === (<ErrorSoapResponse>res).Body.Fault.Detail?.Error?.Code
		)
	) {
		dispatchAuthErrorEvent();
	}
	console.error(
		new Error(
			`${(<ErrorSoapResponse>res).Body.Fault.Detail?.Error?.Code}: ${
				(<ErrorSoapResponse>res).Body.Fault.Reason?.Text
			}`
		)
	);
};

const handleResponseContext = <R extends Record<string, unknown>>(
	res: RawSoapResponse<R>
): void => {
	if (res.Header?.context) {
		const { session } = res.Header.context;

		const notificationsSequence = res.Header.context.notify?.[0]?.seq;

		// TODO this was on the old code, but it's not clear where were supposed to be used
		// const seq = maxBy(_context.notify, 'seq')?.seq ?? 0;

		// Extract and notify used quota from response
		const responseUsedQuota =
			res.Header.context?.refresh?.mbx?.[0]?.s ??
			res.Header.context?.notify?.[0]?.modified?.mbx?.[0]?.s;
		if (responseUsedQuota) {
			dispatchUserQuotaChangeEvent(responseUsedQuota);
		}

		const headerContext = normalizeContext(res.Header.context);

		// Extract and dispatch the "notify" section from the response
		if (headerContext.notify && headerContext.notify.length > 0) {
			dispatchSyncUpdateEvent(headerContext.notify);
		}

		// Extract and dispatch the "refresh" section from the response
		if (headerContext.refresh) {
			dispatchInfoRefreshReceiveEvent(headerContext.refresh);
		}

		// Store the session information
		ApiManager.getApiManager().setSessionInfo({
			session,
			notificationsSequence,
			// TODO remove ASAP
			...(headerContext.refresh ? { legacyRefreshInfo: headerContext.refresh } : undefined)
		});
	}
};

const handleResponseV2 = <R extends Record<string, unknown>>(res: RawSoapResponse<R>): void => {
	ApiManager.getApiManager().stopPolling();

	// In case of application error
	handleFaultResponse(res);

	// Handle response context section
	handleResponseContext(res);

	// While a blocking NoOp is pending, only its own response schedules the next NoOp: the server
	// keeps one blocking NoOp per account and would cancel the pending one with waitDisallowed.
	// A NoOp pending for too long (or sent "in the future", if the clock moved back) is considered
	// lost, and the polling restarts from this response
	const { pendingBlockingNoOp } = ApiManager.getApiManager().getSessionInfo();
	if (pendingBlockingNoOp) {
		const pendingFor = Date.now() - pendingBlockingNoOp.sentAt;
		if (pendingFor >= 0 && pendingFor < BLOCKING_NOOP_MAX_DURATION) {
			return;
		}
	}

	// Trigger the next polling
	const nextPollingConfig = getPollingIntervalConfig(res);
	const pollingFunction = nextPollingConfig.longPolling ? longPollingNoOp : shortPollingNoOp;
	ApiManager.getApiManager().resetPolling(pollingFunction, nextPollingConfig.millisInterval);
};

const handleResponse = <R extends Record<string, unknown>>(
	api: string,
	res: RawSoapResponse<R>
): R | ErrorSoapBodyResponse => {
	handleResponseV2(res);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	return res?.Body?.Fault ? (res.Body as ErrorSoapBodyResponse) : (res.Body[`${api}Response`] as R);
};

/**
 * @deprecated Use soapFetchV2 instead
 */
export const legacySoapFetch = <Request, Response extends Record<string, unknown>>(
	api: string,
	body: Request,
	otherAccount?: string,
	signal?: AbortSignal
): Promise<Response> =>
	soapFetch<Request, Response>(api, body, otherAccount, signal)
		// TODO proper error handling
		.then((res: RawSoapResponse<Response>) => handleResponse(api, res))
		.catch((e) => {
			throw e;
		}) as Promise<Response>;

export const soapFetchV2 = async <Request, Response extends Record<string, unknown>>(
	api: string,
	body: Request,
	otherAccount?: string,
	signal?: AbortSignal
): Promise<RawSoapResponse<Response>> => {
	const rawSoapResponse = await soapFetch<Request, Response>(api, body, otherAccount, signal);
	// apply side effects
	handleResponseV2(rawSoapResponse);
	return rawSoapResponse;
};

/**
 * @deprecated Use soapFetchV2 instead
 */
export const legacyXmlSoapFetch = <Request, Response extends Record<string, unknown>>(
	api: string,
	body: Request,
	otherAccount?: string
): Promise<Response> => {
	const sessionInfo = ApiManager.getApiManager().getSessionInfo();
	const xmlSessionTag = composeSessionTag();
	const xmlAccountTag = composeAccountTag(otherAccount);

	return fetch(`/service/soap/${api}Request`, {
		method: 'POST',
		headers: {
			'content-type': 'application/soap+xml'
		},
		body: `<?xml version="1.0" encoding="utf-8"?>
		<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
			<soap:Header>
				<context xmlns="urn:zimbra">
					<userAgent name="${userAgent}" version="${sessionInfo.carbonioVersion}"/>
					${xmlSessionTag}
					${xmlAccountTag}
					<format type="js"/>
				</context>
			</soap:Header>
			<soap:Body>${body}</soap:Body>
		</soap:Envelope>`
	}) // TODO proper error handling
		.then((res) => res?.json())
		.then((res: RawSoapResponse<Response>) => handleResponse(api, res))
		.catch((e) => {
			throw e;
		}) as Promise<Response>;
};
