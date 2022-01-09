#!/usr/bin/env node
import { promises as fs } from 'fs'
import canvas from 'canvas'
import { OUT_RAW_TILES_DIR, OUT_TILES_DIR } from './_common.js'
import { dirname } from 'path'
import { OUT_MAP_MASK_CFG } from '../global_config.js'
import { PromisePool } from '#lib/utils.js'
import { recreateDir } from '#lib/os.js'
import { loadImageIfExists, optimizeInPlace, saveCanvas } from '#lib/media.js'
import { prepareMask, applyMaskCrop, applyMaskShadow, applyMaskStroke } from '#lib/tiles/mask.js'
import { getSavedRawTiles } from '#lib/tiles/raw.js'
import { makeOutTilePath, makeOutTilesDirPath } from '#lib/tiles/dirs.js'
const { createCanvas } = canvas

/* === CONFIG === */

const BASE_LEVEL = 1 //0 or 1
const MIN_LEVEL = -5
const OUT_TILE_SIZE = 256
const ORIGIN = { tile: { i: -1, j: 2 }, offset: { x: 1498.5 / 2048, y: 1498.5 / 2048 } }

const OPTIMIZE = 5 //or false

/** Extra output map crop, in tiles (output-sized) */
const CROP = {
	left: 3,
	top: 3,
	right: 2,
	bottom: 0,
}

/* === /CONFIG === */

const IN_TILE_SIZE = 1024 * 2 ** BASE_LEVEL
ORIGIN.offset.x = Math.round(ORIGIN.offset.x * IN_TILE_SIZE) / IN_TILE_SIZE
ORIGIN.offset.y = Math.round(ORIGIN.offset.y * IN_TILE_SIZE) / IN_TILE_SIZE

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
	const { rect: inRect } = await getSavedRawTiles(OUT_RAW_TILES_DIR)
	// const inRect = { left: -4, right: -4, top: -7, bottom: -7 }

	const outRect = {
		left: Math.floor(xIn2out(inRect.left)) + CROP.left * 2 ** BASE_LEVEL,
		right: Math.ceil(xIn2out(inRect.right - 1)) - CROP.right * 2 ** BASE_LEVEL,
		top: Math.floor(yIn2out(inRect.top)) + CROP.top * 2 ** BASE_LEVEL,
		bottom: Math.ceil(yIn2out(inRect.bottom - 1)) - CROP.bottom * 2 ** BASE_LEVEL,
	}

	const fullInWidth = (inRect.left - inRect.right + 1) * IN_TILE_SIZE
	const fullInHeight = (inRect.top - inRect.bottom + 1) * IN_TILE_SIZE

	const mask = await prepareMask(OUT_MAP_MASK_CFG, IN_TILE_SIZE, fullInWidth, fullInHeight)

	const outCanvas = createCanvas(OUT_TILE_SIZE, OUT_TILE_SIZE)
	const outRC = outCanvas.getContext('2d')
	outRC.quality = 'best'

	const outCanvasRGB = createCanvas(OUT_TILE_SIZE, OUT_TILE_SIZE)

	const tasks = new PromisePool()

	const optimizationStats = { orig: 0, opt: 0 }

	await recreateDir(makeOutTilesDirPath(OUT_TILES_DIR, 'png'))

	for (let outJ = outRect.top; outJ <= outRect.bottom; outJ++) {
		for (let outI = outRect.left; outI <= outRect.right; outI++) {
			outRC.clearRect(0, 0, outRC.canvas.width, outRC.canvas.height)
			let drawnCount = 0

			const inIFrom = xOut2in(outI)
			const inJFrom = yOut2in(outJ)
			for (let inI = Math.ceil(inIFrom); inI >= Math.ceil(xOut2in(outI + 1)); inI--) {
				for (let inJ = Math.ceil(inJFrom); inJ >= Math.ceil(yOut2in(outJ + 1)); inJ--) {
					const xOffset = (xIn2out(inI) - outI) * OUT_TILE_SIZE
					const yOffset = (yIn2out(inJ) - outJ) * OUT_TILE_SIZE
					if (!isRound(xOffset) || !isRound(yOffset))
						throw new Error(`offset (${xOffset},${yOffset}) is not round`)

					const img = await loadImageCached(`${OUT_RAW_TILES_DIR}/${inJ}_${inI}.png`)
					if (!img) continue

					outRC.drawImage(img, xOffset, yOffset, IN_TILE_SIZE, IN_TILE_SIZE)
					drawnCount++
				}
			}

			if (mask) {
				const x = (inRect.left - inIFrom) * IN_TILE_SIZE
				const y = (inRect.top - inJFrom) * IN_TILE_SIZE
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
					const outFPath = makeOutTilePath(OUT_TILES_DIR, BASE_LEVEL, outI, outJ, 'png')
					await fs.mkdir(dirname(outFPath), { recursive: true })
					if (isOpaque) {
						outCanvasRGB.getContext('2d', { alpha: false }).drawImage(outCanvas, 0, 0)
						await saveCanvas(outFPath, outCanvasRGB)
					} else {
						await saveCanvas(outFPath, outCanvas)
					}
					if (OPTIMIZE) await tasks.add(optimizeInPlace(outFPath, OPTIMIZE, optimizationStats))
				}
			}

			{
				const w = outRect.right - outRect.left + 1
				const h = outRect.bottom - outRect.top + 1
				const n = 1 + outI - outRect.left + w * (outJ - outRect.top)
				const total = w * h
				process.stdout.write(
					`level ${BASE_LEVEL}: ${n}/${total} ${((100 * n) / total).toFixed(0)}%\r`,
				)
			}
		}
	}
	await tasks.end()
	console.log()

	for (let level = BASE_LEVEL - 1, k = 2; level >= MIN_LEVEL; level--, k *= 2) {
		const top = Math.floor(outRect.top / k)
		const bottom = Math.ceil(outRect.bottom / k)
		const left = Math.floor(outRect.left / k)
		const right = Math.ceil(outRect.right / k)

		for (let outJ = top; outJ <= bottom; outJ++) {
			for (let outI = left; outI <= right; outI++) {
				outRC.clearRect(0, 0, outRC.canvas.width, outRC.canvas.height)
				let drawCount = 0

				for (let i = 0; i < 2; i++) {
					for (let j = 0; j < 2; j++) {
						const fpath = makeOutTilePath(OUT_TILES_DIR, level+1, outI*2 + i, outJ*2 + j, 'png') //prettier-ignore
						const img = await loadImageIfExists(fpath)
						if (!img) continue
						const w = OUT_TILE_SIZE / 2
						outRC.drawImage(img, i * w, j * w, w, w)
						drawCount++
					}
				}

				if (drawCount > 0) {
					const outFPath = makeOutTilePath(OUT_TILES_DIR, level, outI, outJ, 'png')
					await fs.mkdir(dirname(outFPath), { recursive: true })
					await saveCanvas(outFPath, outCanvas)
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

	if (OPTIMIZE) {
		const perc = (100 * optimizationStats.opt) / optimizationStats.orig
		console.log(`png optimization rate: ${perc.toFixed(1)}%`)
	}
})().catch(console.error)

function xIn2out(x) {
	return -((x - ORIGIN.tile.i + ORIGIN.offset.x) * IN_TILE_SIZE) / OUT_TILE_SIZE
}
function yIn2out(y) {
	return -((y - ORIGIN.tile.j + ORIGIN.offset.y) * IN_TILE_SIZE) / OUT_TILE_SIZE
}
function xOut2in(x) {
	return (-x * OUT_TILE_SIZE) / IN_TILE_SIZE - ORIGIN.offset.x + ORIGIN.tile.i
}
function yOut2in(y) {
	return (-y * OUT_TILE_SIZE) / IN_TILE_SIZE - ORIGIN.offset.y + ORIGIN.tile.j
}

function isRound(x) {
	return Math.abs(x % 1) < 0.0001
}

// /** @typedef {{fpath:string, img:Promise<canvas.Image>|canvas.Image|null|Error}} ImgCacheItem */
// const imgCache = /**@type {ImgCacheItem[]}*/ ([])
// /** @param {string} fpath */
// async function loadImageCached(fpath) {
// 	const cacheIndex = imgCache.findIndex(x => x.fpath === fpath)
// 	if (cacheIndex === -1) {
// 		const promise = loadImageIfExists(fpath)
// 		const item = /**@type {ImgCacheItem}*/ ({ fpath, img: promise })
// 		imgCache.push(item)
// 		if (imgCache.length > 16) imgCache.shift()

// 		try {
// 			item.img = await promise
// 			return item.img
// 		} catch (err) {
// 			item.img = err
// 			throw err
// 		}
// 	}

// 	const item = imgCache[cacheIndex]

// 	if (item.img instanceof Error) throw item.img
// 	if (item.img && 'then' in item.img) return await item.img
// 	return item.img
// }
