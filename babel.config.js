/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
module.exports = () => {
	const presetEnv = [
		'@babel/preset-env',
		{
			useBuiltIns: 'usage',
			corejs: 3.36
		}
	];
	return {
		presets: [presetEnv, '@babel/preset-react', '@babel/preset-typescript']
	};
};
