import { promises as fs } from 'fs'

/**
 * @param {string} tilesDir
 * @param {import('./raw').MapCode} mapCode
 * @param {string} ext
 */
export function makeOutTilesDirPath(tilesDir, mapCode, ext) {
	return `${tilesDir}/${mapCode}/${ext}`
}

/**
 * @param {string} tilesDir
 * @param {import('./raw').MapCode} mapCode
 * @param {number} level
 * @param {number} i
 * @param {number} j
 * @param {string} ext
 */
export function makeOutTilePath(tilesDir, mapCode, level, i, j, ext) {
	return `${makeOutTilesDirPath(tilesDir, mapCode, ext)}/${level}/${i}/${j}.${ext}`
}

/** @param {string} fpath */
export function parseOutTileFPath(fpath) {
	const m = fpath.match(/\/(-?\d+)\/(-?\d+)\/(-?\d+)\.(\w+)$/)
	if (!m) throw new Error('wrong tile path: ' + fpath)
	return { level: +m[1], i: +m[2], j: +m[3], ext: m[4] }
}

/**
 * @param {string} tilesDir
 * @param {import('./raw').MapCode} mapCode
 * @param {string} ext
 * @param {(fpath:string) => unknown} onFPath
 */
export function forEachOutTileFPath(tilesDir, mapCode, ext, onFPath) {
	return (async function iter(path) {
		const entries = await fs.readdir(path, { withFileTypes: true })
		for (const entry of entries) {
			const entryPath = `${path}/${entry.name}`
			if (entry.isDirectory()) {
				await iter(entryPath)
			} else if (entry.name.endsWith('.' + ext)) {
				await onFPath(entryPath)
			} else {
				throw new Error(`unexpected file: ` + entryPath)
			}
		}
	})(makeOutTilesDirPath(tilesDir, mapCode, ext))
}
