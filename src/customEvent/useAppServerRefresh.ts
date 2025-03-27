/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { useCallback, useEffect, useState } from 'react';

import { ApiEvents, RefreshEvent } from './custumEventDispatcher';
import { ApiManager } from '../ApiManager';
import { SoapRefresh } from '../types/network';

export const useAppServerRefresh = (): SoapRefresh => {
	const initialRefreshInfo = ApiManager.getApiManager().getSessionInfo().legacyRefreshInfo;
	const [refresh, setRefresh] = useState<SoapRefresh>(initialRefreshInfo);

	const listener = useCallback((event: CustomEventInit<RefreshEvent['payload']>) => {
		if (!event.detail) {
			return;
		}
		setRefresh(event.detail);
	}, []);

	useEffect(() => {
		window.addEventListener(ApiEvents.Refresh, listener);

		return () => {
			window.removeEventListener(ApiEvents.Refresh, listener);
		};
	}, [listener]);

	return refresh;
};
