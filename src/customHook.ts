/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useState } from 'react';

export const testFn: () => unknown = (): unknown => {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const [test, setTest] = useState('test');
	return test;
};
