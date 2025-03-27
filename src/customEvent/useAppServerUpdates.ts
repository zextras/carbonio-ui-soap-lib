/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useState } from 'react';

import { ApiEvents, NotifyEvent } from './custumEventDispatcher';
import { SoapNotify } from '../types/network';

export const useAppServerUpdates = (): Array<SoapNotify> => {
	const [updates, setUpdates] = useState<Array<SoapNotify>>([]);

	const updatesListener = useCallback((event: CustomEventInit<NotifyEvent['payload']>) => {
		if (!event.detail || !event.detail.length) {
			return;
		}
		setUpdates(event.detail);
	}, []);

	useEffect(() => {
		window.addEventListener(ApiEvents.Notify, updatesListener);

		return () => {
			window.removeEventListener(ApiEvents.Notify, updatesListener);
		};
	}, [updatesListener]);

	return updates;
};
