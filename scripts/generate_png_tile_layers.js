#!/usr/bin/env node
import { promises as fs } from 'fs'
import canvas from 'canvas'
import { getChosenMapCode, OUT_RAW_TILES_DIR, OUT_TILES_DIR } from './_common.js'
import { dirname } from 'path'
import { MAP_ORIGINS, OUT_MAP_MASK_CFG } from '../global_config.js'
import { PromisePool } from '#lib/utils.js'
import { parseArgs, recreateDir } from '#lib/os.js'
import { loadImageIfExists, optimizeInPlace, saveCanvas } from '#lib/media.js'
import { prepareMask, applyMaskCrop, applyMaskShadow, applyMaskStroke } from '#lib/tiles/mask.js'
import { getSavedRawTiles, xOrigin2orig, yOrigin2orig } from '#lib/tiles/raw.js'
import { makeOutTilePath, makeOutTilesDirPath } from '#lib/tiles/dirs.js'
const { createCanvas } = canvas

/* === CONFIG === */

const BASE_LEVEL = 1 //0 or 1
const MIN_LEVEL = -5
const IN_TILE_SIZE = 1024 //on level 0
const OUT_TILE_SIZE = 256

const OPTIMIZE = 5 //0-7 or false

/** Extra output map crop, in tiles (output-sized on level 0) */
const MAP_CROPS = {
	teyvat: {
		left: 3,
		top: 3,
		right: 2,
		bottom: 0,
	},
	enkanomiya: {
		left: 0,
		top: 1,
		right: 2,
		bottom: 3,
	},
}

// (optional) pre-scaled tiles for level 1 (if not set, tiles will be auto-upscaled from level 0 with bicibic)
const SCALED_LEVEL_1_RAW_TILES_DIR = {
	teyvat: null,
	enkanomiya: OUT_RAW_TILES_DIR + '_x2',
}

/* === /CONFIG === */

const args = parseArgs()
const mapCode = getChosenMapCode(args)

const ORIGIN = MAP_ORIGINS[mapCode]
ORIGIN.offset = {
	x: Math.round(ORIGIN.offset.x * IN_TILE_SIZE) / IN_TILE_SIZE,
	y: Math.round(ORIGIN.offset.y * IN_TILE_SIZE) / IN_TILE_SIZE,
}

const CROP = MAP_CROPS[mapCode]

/** @typedef {{fpath:string, img:Promise<canvas.Image>|canvas.Image|null|Error}} ImgCacheItem */
const imgCache = /**@type {ImgCacheItem[]}*/ ([])
/** @param {string} fpath */
async function loadImageCached(fpath) {
	const cacheIndex = imgCache.findIndex(x => x.fpath === fpath)
	if (cacheIndex === -1) {
		let img
		if (imgCache.length > 16) imgCache.shift()
		try {
			img = await loadImageIfExists(fpath)
			return img
		} catch (err) {
			img = err
			throw err
		} finally {
			imgCache.push({ fpath, img })
		}
	}

	const item = imgCache[cacheIndex]
	if (item.img instanceof Error) throw item.img
	return item.img
}

//
;(async () => {
	const { tiles: inTilesL0, rect: inRect } = await getSavedRawTiles(OUT_RAW_TILES_DIR, mapCode)
	const prescaledLevel1Dir = SCALED_LEVEL_1_RAW_TILES_DIR[mapCode]
	const inTilesL1 =
		(prescaledLevel1Dir && (await getSavedRawTiles(prescaledLevel1Dir, mapCode)).tiles) || inTilesL0
	// const inRect = { left: -4, right: -4, top: -7, bottom: -7 }

	const outCanvas = createCanvas(OUT_TILE_SIZE, OUT_TILE_SIZE)
	const outRC = outCanvas.getContext('2d')
	outRC.quality = 'best'

	const outCanvasRGB = createCanvas(OUT_TILE_SIZE, OUT_TILE_SIZE)

	const optimizationStats = { orig: 0, opt: 0 }

	await recreateDir(makeOutTilesDirPath(OUT_TILES_DIR, mapCode, 'png'))

	if (BASE_LEVEL === 1)
		await generateLayerFromInTiles(inRect, inTilesL1, 1, outCanvas, outCanvasRGB, optimizationStats)
	await generateLayerFromInTiles(inRect, inTilesL0, 0, outCanvas, outCanvasRGB, optimizationStats)

	for (let level = -1; level >= MIN_LEVEL; level--)
		await generateLayerFromPrevious(inRect, level, outCanvas, outCanvasRGB, optimizationStats)

	if (OPTIMIZE) {
		const perc = (100 * optimizationStats.opt) / optimizationStats.orig
		console.log(`png optimization rate: ${perc.toFixed(1)}%`)
	}
})().catch(console.error)

/**
 * @param {import('#lib/tiles/raw').TilesRect} inRect
 * @param {import('#lib/tiles/raw').SavedRawTile[]} inTiles
 * @param {number} level
 * @param {canvas.Canvas} outCanvas
 * @param {canvas.Canvas} outCanvasRGB
 * @param {{ orig:number, opt:number }} optimizationStats
 */
async function generateLayerFromInTiles(inRect, inTiles, level, outCanvas, outCanvasRGB, optimizationStats) {
	const { top: outTop, bottom: outBottom, left: outLeft, right: outRight } = makeOutRect(inRect, level)
	const inTileSize = IN_TILE_SIZE * 2 ** level

	const outRC = outCanvas.getContext('2d')
	outRC.quality = 'best'

	const fullInWidth = (inRect.left - inRect.right + 1) * inTileSize
	const fullInHeight = (inRect.top - inRect.bottom + 1) * inTileSize
	const mask = await prepareMask(OUT_MAP_MASK_CFG[mapCode], inTileSize, fullInWidth, fullInHeight)

	const tasks = new PromisePool()

	for (let outJ = outTop; outJ <= outBottom; outJ++) {
		for (let outI = outLeft; outI <= outRight; outI++) {
			outRC.clearRect(0, 0, outRC.canvas.width, outRC.canvas.height)
			let drawnCount = 0

			const inIFrom = xOut2in(outI, level)
			const inJFrom = yOut2in(outJ, level)
			for (const inTile of inTiles) {
				let x, y
				if (inTile.type === 'grid') {
					x = (xIn2out(inTile.i, level) - outI) * OUT_TILE_SIZE
					y = (yIn2out(inTile.j, level) - outJ) * OUT_TILE_SIZE
				} else {
					x = (xIn2out(xOrigin2orig(inTile.x, ORIGIN), level) - outI) * OUT_TILE_SIZE
					y = (yIn2out(yOrigin2orig(inTile.y, ORIGIN), level) - outJ) * OUT_TILE_SIZE
				}
				if (!isRound(x) || !isRound(y)) throw new Error(`offset (${x},${y}) is not round`)

				const isVisible = x + inTileSize > 0 && y + inTileSize > 0 && x < inTileSize && y < inTileSize
				if (isVisible) {
					const img = await loadImageCached(inTile.fpath)
					outRC.drawImage(img, x, y, inTileSize, inTileSize)
					drawnCount++
				}
			}

			if (mask) {
				const x = (inRect.left - inIFrom) * inTileSize
				const y = (inRect.top - inJFrom) * inTileSize
				applyMaskCrop(outRC, mask.imgs, -x, -y)
				applyMaskShadow(outRC, 0, 0, mask, -x, -y, OUT_TILE_SIZE, OUT_TILE_SIZE)
				applyMaskStroke(outRC, mask.imgs, -x, -y)
			}

			if (drawnCount > 0) {
				const { data } = outRC.getImageData(0, 0, OUT_TILE_SIZE, OUT_TILE_SIZE)
				let isBlank = true
				let isOpaque = true
				for (let i = 0; i < data.length; i += 4) {
					const a = data[i + 3]
					if (a !== 0) isBlank = false
					if (a !== 255) isOpaque = false
					if (!isBlank && !isOpaque) break
				}

				if (!isBlank) {
					const outFPath = makeOutTilePath(OUT_TILES_DIR, mapCode, level, outI, outJ, 'png')
					await fs.mkdir(dirname(outFPath), { recursive: true })
					await saveMaybeOpaque(outFPath, outCanvas, outCanvasRGB, isOpaque)
					if (OPTIMIZE) await tasks.add(optimizeInPlace(outFPath, OPTIMIZE, optimizationStats))
				}
			}

			{
				const w = outRight - outLeft + 1
				const h = outBottom - outTop + 1
				const n = 1 + outI - outLeft + w * (outJ - outTop)
				const total = w * h
				process.stdout.write(`level ${level}: ${n}/${total} ${((100 * n) / total).toFixed(0)}%\r`)
			}
		}
	}
	await tasks.end()
	console.log()
}

/**
 * @param {import('#lib/tiles/raw').TilesRect} inRect
 * @param {number} level
 * @param {canvas.Canvas} outCanvas
 * @param {canvas.Canvas} outCanvasRGB
 * @param {{ orig:number, opt:number }} optimizationStats
 */
async function generateLayerFromPrevious(inRect, level, outCanvas, outCanvasRGB, optimizationStats) {
	const { top, bottom, left, right } = makeOutRect(inRect, level)

	const outRC = outCanvas.getContext('2d')
	outRC.quality = 'best'

	const tasks = new PromisePool()

	for (let outJ = top; outJ <= bottom; outJ++) {
		for (let outI = left; outI <= right; outI++) {
			outRC.clearRect(0, 0, outRC.canvas.width, outRC.canvas.height)
			let drawCount = 0

			for (let i = 0; i < 2; i++) {
				for (let j = 0; j < 2; j++) {
					const fpath = makeOutTilePath(
						OUT_TILES_DIR, mapCode, level+1, outI*2 + i, outJ*2 + j, 'png') //prettier-ignore
					const img = await loadImageIfExists(fpath)
					if (!img) continue
					const w = OUT_TILE_SIZE / 2
					outRC.drawImage(img, i * w, j * w, w, w)
					drawCount++
				}
			}

			if (drawCount > 0) {
				const { data } = outRC.getImageData(0, 0, OUT_TILE_SIZE, OUT_TILE_SIZE)
				let isOpaque = true
				for (let i = 0; i < data.length; i += 4) {
					const a = data[i + 3]
					if (a !== 255) {
						isOpaque = false
						break
					}
				}

				const outFPath = makeOutTilePath(OUT_TILES_DIR, mapCode, level, outI, outJ, 'png')
				await fs.mkdir(dirname(outFPath), { recursive: true })
				await saveMaybeOpaque(outFPath, outCanvas, outCanvasRGB, isOpaque)
				if (OPTIMIZE) await tasks.add(optimizeInPlace(outFPath, OPTIMIZE, optimizationStats))
			}

			{
				const w = right - left + 1
				const h = bottom - top + 1
				const n = 1 + outI - left + w * (outJ - top)
				const total = w * h
				process.stdout.write(`level ${level}: ${n}/${total} ${((100 * n) / total).toFixed(0)}%\r`)
			}
		}
	}
	await tasks.end()
	console.log()
}

/**
 * @param {string} fpath
 * @param {canvas.Canvas} canvas
 * @param {canvas.Canvas} canvasRGB
 * @param {boolean} isOpaque
 */
async function saveMaybeOpaque(fpath, canvas, canvasRGB, isOpaque) {
	if (isOpaque) {
		canvasRGB.getContext('2d', { alpha: false }).drawImage(canvas, 0, 0)
		await saveCanvas(fpath, canvasRGB)
	} else {
		await saveCanvas(fpath, canvas)
	}
}

/**
 * @param {import('#lib/tiles/raw').TilesRect} inRect
 * @param {number} level
 * @returns {import('#lib/tiles/raw').TilesRect}
 */
function makeOutRect(inRect, level) {
	return {
		left: Math.floor(xIn2out(inRect.left, level) + CROP.left * 2 ** level),
		right: Math.ceil(xIn2out(inRect.right - 1, level) - CROP.right * 2 ** level),
		top: Math.floor(yIn2out(inRect.top, level) + CROP.top * 2 ** level),
		bottom: Math.ceil(yIn2out(inRect.bottom - 1, level) - CROP.bottom * 2 ** level),
	}
}

/** @param {number} x @param {number} level */
function xIn2out(x, level) {
	return -((x - ORIGIN.tile.i + ORIGIN.offset.x) * IN_TILE_SIZE * 2 ** level) / OUT_TILE_SIZE
}
/** @param {number} y @param {number} level */
function yIn2out(y, level) {
	return -((y - ORIGIN.tile.j + ORIGIN.offset.y) * IN_TILE_SIZE * 2 ** level) / OUT_TILE_SIZE
}
/** @param {number} x @param {number} level */
function xOut2in(x, level) {
	return (-x * OUT_TILE_SIZE) / (IN_TILE_SIZE * 2 ** level) - ORIGIN.offset.x + ORIGIN.tile.i
}
/** @param {number} y @param {number} level */
function yOut2in(y, level) {
	return (-y * OUT_TILE_SIZE) / (IN_TILE_SIZE * 2 ** level) - ORIGIN.offset.y + ORIGIN.tile.j
}

function isRound(x) {
	return Math.abs(x % 1) < 0.0001
}
