import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/index.ts',
	plugins: [
		typescript()
	],
	output: {
		file: '/dist/bundle.mjs',
		format: 'es',
		sourcemap: true,
	},
	external: ['react']
};