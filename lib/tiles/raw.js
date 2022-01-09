import { promises as fs } from 'fs'
import { basename } from 'path'

/** @typedef {{left:number,right:number,top:number,bottom:number}} TilesRect */
/** @typedef {{dirs:string[], rect?:TilesRect, choices?:string[]}} TilesConfig */

export function rawTileKey(i, j) {
	return `${j}_${i}`
}

/**
 * @param {TilesConfig} cfg
 * @returns {Record<string,number>}
 */
export function getChosenTilesMap(cfg) {
	if (!cfg.rect || !cfg.choices) return {}
	const { left, top } = cfg.rect
	const res = /**@type {Record<string,number>}*/ ({})
	cfg.choices.forEach((row, rowI) => {
		Array.from(row).forEach((cell, cellI) => {
			if (cell !== '.') res[rawTileKey(left - cellI, top - rowI)] = parseInt(cell)
		})
	})
	return res
}

/**
 * @param {TilesConfig} cfg
 * @param {(i:number, j:number, isRowStart:boolean, fpaths:string[], tilesRect:TilesRect) => Promise<unknown>} tileFunc
 */
export async function forEachTileGroup(cfg, tileFunc) {
	const tileFPaths = (
		await Promise.all(cfg.dirs.map(dir => fs.readdir(dir).then(items => items.map(x => `${dir}/${x}`))))
	).flat()

	let tilesRect = cfg.rect
	if (!tilesRect) {
		tilesRect = { left: 0, right: 0, top: 0, bottom: 0 }
		for (const fpath of tileFPaths) {
			const m = basename(fpath).match(/UI_MapBack_(-?\d+)_(-?\d+)(?: #\d+)?.png/)
			if (m) {
				const y = parseInt(m[1])
				const x = parseInt(m[2])
				if (x > tilesRect.left) tilesRect.left = x
				if (x < tilesRect.right) tilesRect.right = x
				if (y > tilesRect.top) tilesRect.top = y
				if (y < tilesRect.bottom) tilesRect.bottom = y
			}
		}
	}

	for (let j = tilesRect.top; j >= tilesRect.bottom; j--) {
		for (let i = tilesRect.left; i >= tilesRect.right; i--) {
			const isRowStart = i === tilesRect.left
			const size2fpath = /**@type {Map<number,string>}*/ (new Map())

			for (const fpath of tileFPaths) {
				const prefix = `UI_MapBack_${j}_${i}`
				const fname = basename(fpath)
				if (fname.startsWith(prefix + '.') || fname.startsWith(prefix + ' #')) {
					const stat = await fs.stat(fpath)
					size2fpath.set(stat.size, fpath)
				}
			}

			const fpaths = Array.from(size2fpath.entries())
				.sort((a, b) => a[0] - b[0])
				.map(x => x[1])
			await tileFunc(i, j, isRowStart, fpaths, tilesRect)
		}
	}
	return tilesRect
}

/**
 * @param {string} rawTilesDir
 * @param {number} i
 * @param {number} j
 * @returns
 */
export function makeSavedRawTileFPath(rawTilesDir, i, j) {
	return `${rawTilesDir}/${j}_${i}.png`
}

/** @param {string} rawTilesDir */
export async function getSavedRawTiles(rawTilesDir) {
	const tiles = /**@type {{i:number, j:number, fpath:string}[]}*/ ([])
	for (const fname of await fs.readdir(rawTilesDir)) {
		const fpath = `${rawTilesDir}/${fname}`
		const m = fname.match(/^(-?\d+)_(-?\d+)\.png$/)
		if (!m) throw new Error('wrong raw tile name: ' + fpath)
		const j = parseInt(m[1])
		const i = parseInt(m[2])
		tiles.push({ i, j, fpath })
	}

	const rect = { left: 0, right: 0, top: 0, bottom: 0 }
	for (const { i, j } of tiles) {
		if (i > rect.left) rect.left = i
		if (i < rect.right) rect.right = i
		if (j > rect.top) rect.top = j
		if (j < rect.bottom) rect.bottom = j
	}
	return { tiles, rect }
}
