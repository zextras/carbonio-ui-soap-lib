import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/index.ts',
	plugins: [
		typescript()
	],
	output: {
		dir: 'dist',
		format: 'es',
		sourcemap: true,
	},
	external: ['react']
};