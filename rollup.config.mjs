/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
	input: 'src/index.ts',
	output: {
		file: 'dist/bundle.mjs',
		format: 'es',
		sourcemap: true
	},
	plugins: [
		nodeResolve({
			extensions: ['.mjs', '.js', '.json', '.node', '.ts', '.tsx', '.jsx']
		}),
		babel({ babelHelpers: 'bundled', extensions: ['.js', '.jsx', '.ts', '.tsx'], ignore: ['node_modules'] })
	],
	external: ['react']
};
