/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { JSNS } from '../../constants';
import type {
	AccountRights,
	AccountSettingsPrefs,
	Identity,
	Signature,
	ZimletProp
} from '../account';
import type { ValueOf } from '../typeUtils';

export * from './soap';

export type ZimletPkgDescription = {
	zimlet: Array<{
		name: string;
		label: string;
		description: string;
		version: string;
		/* Property related to Zextras */ zapp?: 'true';
		/* Property related to Zextras */ 'zapp-main'?: string;
		/* Property related to Zextras */ 'zapp-version'?: string;
		/* Property related to Zextras */ 'zapp-handlers'?: string;
		/* Property related to Zextras */ 'zapp-style'?: string;
		/* Property related to Zextras */ 'zapp-theme'?: string;
		/* Property related to Zextras */ 'zapp-serviceworker-extension'?: string;
	}>;
	zimletContext: Array<{
		baseUrl: string;
		presence: 'enabled';
		priority: number;
	}>;
};

export type GetInfoResponse = {
	name: string;
	id: string;
	attrs: {
		_attrs: {
			displayName: string;
		};
	};
	prefs: {
		_attrs: AccountSettingsPrefs;
	};
	signatures: {
		signature: Array<Signature>;
	};
	identities: {
		identity: Array<Identity>;
	};
	zimlets: {
		zimlet: Array<ZimletPkgDescription>;
	};
	props: {
		prop: Array<ZimletProp>;
	};
	version: string;
	rights: AccountRights;
	lifetime: number;
	changePasswordURL?: string;
};

export type Locale = {
	id: string;
	localName: string;
	name: string;
};
export type AvailableLocalesResponse = {
	locale: Array<Locale>;
};

export type NameSpace = ValueOf<typeof JSNS>;
