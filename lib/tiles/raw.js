import { promises as fs } from 'fs'
import { basename } from 'path'
import { mustBeDefined } from '#lib/utils.js'

/** @typedef {{left:number,right:number,top:number,bottom:number}} TilesRect */
/** @typedef {{name:RegExp, x:number, y:number, choice:number}} ManualTileConfig */
/** @typedef {{dirs:string[], rect?:TilesRect, choices?:string[], manual?:ManualTileConfig[]}} TilesConfig */

/** @typedef {'teyvat'|'enkanomiya'|'chasm'} MapCode */
/** @template T @typedef {Record<MapCode,T>} ForEachMap */
export const MAP_CODES = /**@type {MapCode[]}*/ (['teyvat', 'enkanomiya', 'chasm'])

/** @typedef {{type:'grid', key:string, i:number, j:number}} RawGridTileReference */
/** @typedef {{type:'manual', key:string, index:number}} RawManualTileReference */
/** @typedef {RawGridTileReference | RawManualTileReference} RawTileReference */

/** @typedef {{tile:{i:number, j:number}, offset:{x:number, y:number}}} MapOrigin */

export function rawGridTileKey(i, j) {
	return `${j}_${i}`
}
export function rawManualTileKey(i) {
	return `manual${i}`
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
			if (cell !== '.') res[rawGridTileKey(left - cellI, top - rowI)] = parseInt(cell)
		})
	})
	cfg.manual?.forEach((x, i) => {
		res[rawManualTileKey(i)] = x.choice
	})
	return res
}

/**
 * @param {TilesConfig} cfg
 * @param {MapCode} mapCode
 * @param {(ref:RawTileReference, fpaths:string[], tilesRect:TilesRect, progress:number) => Promise<unknown>} tileFunc
 */
export async function forEachTileGroup(cfg, mapCode, tileFunc) {
	const allFPaths = (
		await Promise.all(cfg.dirs.map(dir => fs.readdir(dir).then(items => items.map(x => `${dir}/${x}`))))
	).flat()

	let tileRe, tilePrefix
	if (mapCode === 'teyvat') {
		tileRe = /UI_MapBack_(-?\d+)_(-?\d+)(?: #\d+)?.png/
		tilePrefix = 'UI_MapBack_'
	} else if (mapCode === 'enkanomiya') {
		tileRe = /UI_MapBack_AbyssalPalace_(-?\d+)_(-?\d+)(?: #\d+)?.png/
		tilePrefix = 'UI_MapBack_AbyssalPalace_'
	} else if (mapCode === 'chasm') {
		tileRe = /UI_MapBack_TheChasm_(-?\d+)_(-?\d+)(?: #\d+)?.png/
		tilePrefix = 'UI_MapBack_TheChasm_'
	} else {
		throw new Error('unsupported map: ' + mapCode)
	}

	let tilesRect = cfg.rect
	if (!tilesRect) {
		tilesRect = { left: 0, right: 0, top: 0, bottom: 0 }
		for (const fpath of allFPaths) {
			const m = basename(fpath).match(tileRe)
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

	const manualTiles = cfg.manual ?? []
	const w = tilesRect.left - tilesRect.right + 1
	const h = tilesRect.top - tilesRect.bottom + 1
	const totalCount = w * h + manualTiles.length

	for (let j = tilesRect.top; j >= tilesRect.bottom; j--) {
		for (let i = tilesRect.left; i >= tilesRect.right; i--) {
			const tileFPaths = []

			for (const fpath of allFPaths) {
				const prefix = `${tilePrefix}${j}_${i}`
				const fname = basename(fpath)
				if (fname.startsWith(prefix + '.') || fname.startsWith(prefix + ' #')) {
					tileFPaths.push(fpath)
				}
			}

			tileFPaths.sort()
			const progress = (1 + tilesRect.left - i + w * (tilesRect.top - j)) / totalCount
			await tileFunc({ type: 'grid', i, j, key: rawGridTileKey(i, j) }, tileFPaths, tilesRect, progress)
		}
	}

	for (let i = 0; i < manualTiles.length; i++) {
		const { name } = manualTiles[i]
		const fpaths = []
		for (const fpath of allFPaths) {
			const fname = basename(fpath)
			if (name.test(fname)) fpaths.push(fpath)
		}
		const progress = (1 + w * h + i) / totalCount
		const key = rawManualTileKey(i)
		if (fpaths.length === 0) console.warn('WARN: found no tiles matching ' + name)
		else await tileFunc({ type: 'manual', key, index: i }, fpaths, tilesRect, progress)
	}

	return tilesRect
}

/**
 * @param {string} rawTilesDir
 * @param {MapCode} mapCode
 */
export function makeSavedRawTilesDirPath(rawTilesDir, mapCode) {
	return `${rawTilesDir}/${mapCode}`
}
/**
 * @param {string} rawTilesDir
 * @param {MapCode} mapCode
 * @param {RawTileReference} ref
 * @param {TilesConfig} cfg
 */
export function makeSavedRawTileFPath(rawTilesDir, mapCode, ref, cfg) {
	let name
	if (ref.type === 'grid') {
		name = `grid_${ref.j}_${ref.i}`
	} else {
		const mCfg = mustBeDefined(cfg.manual)[ref.index]
		name = `manual${ref.index}_${(mCfg.x * 4096).toFixed(0)}_${(mCfg.y * 4096).toFixed(0)}`
	}
	return `${makeSavedRawTilesDirPath(rawTilesDir, mapCode)}/${name}.png`
}

/** @typedef {(({type:'grid', i:number, j:number}|{type:'manual', x:number, y:number}) & {fpath:string})} SavedRawTile */

/**
 * @param {string} rawTilesDir
 * @param {MapCode} mapCode
 */
export async function getSavedRawTiles(rawTilesDir, mapCode) {
	const rawMapDir = makeSavedRawTilesDirPath(rawTilesDir, mapCode)
	const tiles = /**@type {SavedRawTile[]}*/ ([])
	for (const fname of await fs.readdir(rawMapDir)) {
		const fpath = `${rawMapDir}/${fname}`
		let m
		if ((m = fname.match(/^grid_(-?\d+)_(-?\d+)\.png$/)) !== null) {
			const j = parseInt(m[1])
			const i = parseInt(m[2])
			tiles.push({ type: 'grid', i, j, fpath })
		} else if ((m = fname.match(/^manual\d+_(-?\d+)_(-?\d+)\.png$/)) !== null) {
			const x = parseInt(m[1]) / 4096
			const y = parseInt(m[2]) / 4096
			tiles.push({ type: 'manual', x, y, fpath })
		} else {
			throw new Error('wrong raw tile name: ' + fpath)
		}
	}

	const rect = { left: 0, right: 0, top: 0, bottom: 0 }
	for (const tile of tiles) {
		if (tile.type === 'grid') {
			const { i, j } = tile
			if (i > rect.left) rect.left = i
			if (i < rect.right) rect.right = i
			if (j > rect.top) rect.top = j
			if (j < rect.bottom) rect.bottom = j
		}
	}
	return { tiles, rect }
}

/**
 * @param {number} x
 * @param {MapOrigin} origin
 */
export function xOrigin2orig(x, origin) {
	return -x - origin.offset.x + origin.tile.i
}
/**
 * @param {number} y
 * @param {MapOrigin} origin
 */
export function yOrigin2orig(y, origin) {
	return -y - origin.offset.y + origin.tile.j
}
