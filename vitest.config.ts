/*
 * SPDX-FileCopyrightText: 2025 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: 'vitest.setup.ts',
		exclude: [
			'dist/**',
			'node_modules/**',
		],
		coverage: {
			enabled: true,
			provider: 'v8',
			reporter: ['text', 'cobertura', 'lcov'],
			reportsDirectory: 'coverage',
			include: [
				'src/**'
			],
			exclude: [
				'**/(test|mock)*.ts(x)?', // exclude file which name starts with test or mock
				'src/**/types/*', // exclude types
				'src/tests/*', // exclude test folder
				'src/index.ts', // exclude index.ts
				'src/constants', // exclude constants.ts
			],
		},
		reporters: ['junit'],
		outputFile: 'junit.xml'
	}
});
