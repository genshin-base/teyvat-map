import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const __filename = fileURLToPath(import.meta.url)
export const BASE_DIR = dirname(__filename)

export default {
	input: `${BASE_DIR}/index.js`,
	output: {
		file: `${BASE_DIR}/bundle.js`, //should be set externally
		format: /**@type {import('rollup').ModuleFormat}*/ ('iife'),
	},
	onwarn(message, warn) {
		if (message.code === 'MISSING_NODE_BUILTINS') return
		warn(message)
	},
	plugins: [nodeResolve()],
}
