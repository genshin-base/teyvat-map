import nodeResolve from '@rollup/plugin-node-resolve'
import alias from '@rollup/plugin-alias'
import { terser } from 'rollup-plugin-terser'

export default {
	input: `${__dirname}/index.js`,
	output: {
		file: `${__dirname}/bundle.js`,
		format: 'module',
		sourcemap: true,
	},
	plugins: [
		nodeResolve(),
		// TODO: waiting https://github.com/rollup/plugins/issues/1077
		alias({
			entries: [{ find: '#lib', replacement: `${__dirname}/../lib` }],
		}),
		terser(),
	],
	watch: {
		clearScreen: false,
	},
}
