/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useState } from 'react';

import { ApiEvents, SyncUpdateEvent } from './customEventDispatcher';
import { SoapNotify } from '../types/network';

export const useSync = (): Array<SoapNotify> => {
	const [updates, setUpdates] = useState<Array<SoapNotify>>([]);

	const updatesListener = useCallback((event: CustomEventInit<SyncUpdateEvent['payload']>) => {
		if (!event.detail || !event.detail.length) {
			return;
		}
		setUpdates(event.detail);
	}, []);

	useEffect(() => {
		window.addEventListener(ApiEvents.SyncUpdate, updatesListener);

		return () => {
			window.removeEventListener(ApiEvents.SyncUpdate, updatesListener);
		};
	}, [updatesListener]);

	return updates;
};
