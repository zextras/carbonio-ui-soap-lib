/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { HttpResponseResolver } from 'msw';
import { HttpResponse } from 'msw';

import { GetInfoResponse, SoapBody } from '../../../types/network';

const DEFAULT_ID = 'logged-user-id';
export const LOGGED_USER = {
	id: DEFAULT_ID,
	name: 'LoggedUser',
	prefs: {},
	attrs: {
		displayName: 'Logged User'
	},
	props: [],
	identities: {
		identity: [
			{
				name: 'DEFAULT',
				id: DEFAULT_ID,
				_attrs: { zimbraPrefIdentityId: DEFAULT_ID, zimbraPrefFromAddressType: 'sendAs' as const }
			}
		]
	}
};

type GetInfoRequestBody = {
	GetInfoRequest: SoapBody<{
		rights: string;
	}>;
};

type GetInfoResponseBody = {
	Body: {
		GetInfoResponse: GetInfoResponse;
		Fault?: { Detail?: { Error?: { Code?: string; Detail?: string } }; Reason?: { Text: string } };
	};
};

export const getGetInfoRequest =
	(
		getInfoResponse?: Partial<GetInfoResponse>
	): HttpResponseResolver<never, GetInfoRequestBody, GetInfoResponseBody> =>
	() =>
		HttpResponse.json({
			Body: {
				GetInfoResponse: {
					id: LOGGED_USER.id,
					name: LOGGED_USER.name,
					version: '',
					identities: LOGGED_USER.identities,
					signatures: { signature: [] },
					rights: { targets: [] },
					zimlets: { zimlet: [] },
					lifetime: 86400000,
					...getInfoResponse,
					prefs: { _attrs: { ...LOGGED_USER.prefs, ...getInfoResponse?.prefs?._attrs } },
					attrs: { _attrs: { ...LOGGED_USER.attrs, ...getInfoResponse?.attrs?._attrs } },
					props: {
						prop: { ...LOGGED_USER.props, ...getInfoResponse?.props?.prop }
					}
				}
			}
		});
