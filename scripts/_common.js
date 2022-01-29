import { normalize, dirname } from 'path'
import { fileURLToPath } from 'url'
import { MAP_CODES } from '#lib/tiles/raw.js'

const __filename = fileURLToPath(import.meta.url)
export const BASE_DIR = normalize(`${dirname(__filename)}/..`)

export const OUT_RAW_TILES_DIR = `${BASE_DIR}/raw_tiles`
export const OUT_TILES_DIR = `${BASE_DIR}/tiles`

/**
 * @param {Record<string, string>} args
 * @returns {import('#lib/tiles/raw').MapCode}
 */
export function getChosenMapCode(args) {
	let code = args['--map']
	if (code === undefined) {
		console.warn(`no --map argument, assuming 'teyvat'`)
		code = 'teyvat'
	}
	// @ts-ignore
	if (!MAP_CODES.includes(code)) {
		console.error(`wrong map code '${code}', should be one of: ${MAP_CODES.join(', ')}`)
		process.exit(1)
	}
	// @ts-ignore
	return code
}
