/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/index.ts',
	plugins: [typescript()],
	output: {
		file: 'dist/bundle.mjs',
		format: 'es',
		sourcemap: true
	},
	external: ['react']
};
