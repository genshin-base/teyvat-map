#!/usr/bin/env node
import { parseArgs, relativeToCwd } from '#lib/os.js'
import canvas from 'canvas'
import { OUT_RAW_TILES_DIR, BASE_DIR, getChosenMapCode } from './_common.js'
import { MAP_ORIGINS, OUT_MAP_MASK_CFG } from '../global_config.js'
import { prepareMask, applyMaskCrop, applyMaskShadow, applyMaskStroke } from '#lib/tiles/mask.js'
import { getSavedRawTiles, xOrigin2orig, yOrigin2orig } from '#lib/tiles/raw.js'
import { saveCanvas } from '#lib/media.js'
const { createCanvas, loadImage } = canvas

/* === CONFIG === */

const TILE_SIZE = 1024

/** Extra output map crop, in pixels (may be negative) */
const CROP = {
	teyvat: {
		left: Math.round(TILE_SIZE * 0.85),
		top: Math.round(TILE_SIZE * 0.85),
		right: Math.round(TILE_SIZE * 0.6),
		bottom: 0,
	},
	enkanomiya: {
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
	},
	chasm: {
		left: Math.round(TILE_SIZE * 0.41),
		top: Math.round(TILE_SIZE * 0.71),
		right: Math.round(TILE_SIZE * 0.8),
		bottom: Math.round(TILE_SIZE * 0.88),
	},
}

/* === /CONFIG === */

;(async () => {
	const args = parseArgs()
	const mapCode = getChosenMapCode(args)

	const mapOrigin = MAP_ORIGINS[mapCode]

	const { tiles, rect } = await getSavedRawTiles(OUT_RAW_TILES_DIR, mapCode)
	// rect.bottom = rect.right = 0
	const crop = CROP[mapCode]

	const fullWidth = (rect.left - rect.right + 1) * TILE_SIZE
	const fullHeight = (rect.top - rect.bottom + 1) * TILE_SIZE

	const outCanvas = createCanvas(fullWidth - crop.left - crop.right, fullHeight - crop.top - crop.bottom)
	const rc = outCanvas.getContext('2d')
	rc.patternQuality = 'best'

	const mask = await prepareMask(OUT_MAP_MASK_CFG[mapCode], TILE_SIZE, fullWidth, fullHeight)

	process.stdout.write('drawing')
	for (const tile of tiles) {
		let x = rect.left * TILE_SIZE - crop.left
		let y = rect.top * TILE_SIZE - crop.top
		if (tile.type === 'grid') {
			x += -tile.i * TILE_SIZE
			y += -tile.j * TILE_SIZE
		} else {
			x += -xOrigin2orig(tile.x, mapOrigin) * TILE_SIZE
			y += -yOrigin2orig(tile.y, mapOrigin) * TILE_SIZE
		}
		try {
			const img = await loadImage(tile.fpath)
			rc.drawImage(img, Math.round(x), Math.round(y), TILE_SIZE, TILE_SIZE)
		} catch (err) {
			if (err.code !== 'ENOENT') throw err
		}
		process.stdout.write('.')
	}
	console.log()

	if (mask) {
		process.stdout.write('applying mask')

		applyMaskCrop(rc, mask.imgs, -crop.left, -crop.top)
		process.stdout.write('.')

		if (mask.shadows.length > 0) {
			for (let j = rect.top; j >= rect.bottom; j--) {
				for (let i = rect.left; i >= rect.right; i--) {
					const x = (rect.left - i) * TILE_SIZE
					const y = (rect.top - j) * TILE_SIZE

					rc.save()
					rc.beginPath()
					rc.rect(x - crop.left, y - crop.top, TILE_SIZE, TILE_SIZE)
					rc.clip()
					applyMaskShadow(rc, x - crop.left, y - crop.top, mask, -x, -y, TILE_SIZE, TILE_SIZE)
					rc.restore()
					process.stdout.write('.')
				}
			}
		}

		applyMaskStroke(rc, mask.imgs, -crop.left, -crop.top)
		process.stdout.write('.')
		console.log()
	}

	console.log('saving')
	const outFPath = `${BASE_DIR}/map_${mapCode}.png`
	await saveCanvas(outFPath, outCanvas)

	console.log(`saved to ${relativeToCwd(outFPath)}`)
	console.log('done.')
})().catch(console.error)
