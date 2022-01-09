import { promises as fs } from 'fs'

/**
 * @param {string} tilesDir
 * @param {string} ext
 */
export function makeOutTilesDirPath(tilesDir, ext) {
	return `${tilesDir}/${ext}`
}

/**
 * @param {string} tilesDir
 * @param {number} level
 * @param {number} i
 * @param {number} j
 * @param {string} ext
 */
export function makeOutTilePath(tilesDir, level, i, j, ext) {
	return `${makeOutTilesDirPath(tilesDir, ext)}/${level}/${i}/${j}.${ext}`
}

/** @param {string} fpath */
export function parseOutTileFPath(fpath) {
	const m = fpath.match(/\/(-?\d+)\/(-?\d+)\/(-?\d+)\.(\w+)$/)
	if (!m) throw new Error('wrong tile path: ' + fpath)
	return { level: +m[1], i: +m[2], j: +m[3], ext: m[4] }
}

/**
 * @param {string} tilesDir
 * @param {string} ext
 * @param {(fpath:string) => unknown} onFPath
 */
export function forEachOutTileFPath(tilesDir, ext, onFPath) {
	return (async function iter(path) {
		const entries = await fs.readdir(path, { withFileTypes: true })
		for (const entry of entries) {
			const entryPath = `${path}/${entry.name}`
			if (entry.isDirectory()) {
				await iter(entryPath)
			} else if (entry.name.endsWith('.png')) {
				await onFPath(entryPath)
			} else {
				throw new Error(`unexpected file: ` + entryPath)
			}
		}
	})(makeOutTilesDirPath(tilesDir, ext))
}
