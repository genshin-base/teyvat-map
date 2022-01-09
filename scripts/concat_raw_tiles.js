#!/usr/bin/env node
import { relativeToCwd } from '#lib/os.js'
import canvas from 'canvas'
import { createWriteStream } from 'fs'
import { OUT_RAW_TILES_DIR, BASE_DIR } from './_common.js'
import { OUT_MAP_MASK_CFG } from '../global_config.js'
import { prepareMask, applyMaskCrop, applyMaskShadow, applyMaskStroke } from '#lib/tiles/mask.js'
import { getSavedRawTiles } from '#lib/tiles/raw.js'
const { createCanvas, loadImage } = canvas

/* === CONFIG === */

const TILE_SIZE = 512

/** Extra output map crop, in pixels (may be negative) */
const CROP = {
	left: Math.round(TILE_SIZE * 0.85),
	top: Math.round(TILE_SIZE * 0.85),
	right: Math.round(TILE_SIZE * 0.6),
	bottom: 0,
}

/* === /CONFIG === */

;(async () => {
	const { rect } = await getSavedRawTiles(OUT_RAW_TILES_DIR)
	// rect.bottom = rect.right = 0

	const fullWidth = (rect.left - rect.right + 1) * TILE_SIZE
	const fullHeight = (rect.top - rect.bottom + 1) * TILE_SIZE

	const outCanvas = createCanvas(fullWidth - CROP.left - CROP.right, fullHeight - CROP.top - CROP.bottom)
	const rc = outCanvas.getContext('2d')
	rc.patternQuality = 'best'

	const mask = await prepareMask(OUT_MAP_MASK_CFG, TILE_SIZE, fullWidth, fullHeight)

	process.stdout.write('drawing')
	for (let j = rect.top; j >= rect.bottom; j--) {
		for (let i = rect.left; i >= rect.right; i--) {
			const x = (rect.left - i) * TILE_SIZE - CROP.left
			const y = (rect.top - j) * TILE_SIZE - CROP.top
			try {
				const img = await loadImage(`${OUT_RAW_TILES_DIR}/${j}_${i}.png`)
				rc.drawImage(img, x, y, TILE_SIZE, TILE_SIZE)
			} catch (err) {
				if (err.code !== 'ENOENT') throw err
			}
			process.stdout.write('.')
		}
	}
	console.log()

	if (mask) {
		process.stdout.write('applying mask')

		applyMaskCrop(rc, mask.imgs, -CROP.left, -CROP.top)
		process.stdout.write('.')

		if (mask.shadows.length > 0) {
			for (let j = rect.top; j >= rect.bottom; j--) {
				for (let i = rect.left; i >= rect.right; i--) {
					const x = (rect.left - i) * TILE_SIZE
					const y = (rect.top - j) * TILE_SIZE

					rc.save()
					rc.beginPath()
					rc.rect(x - CROP.left, y - CROP.top, TILE_SIZE, TILE_SIZE)
					rc.clip()
					applyMaskShadow(rc, x - CROP.left, y - CROP.top, mask, -x, -y, TILE_SIZE, TILE_SIZE)
					rc.restore()
					process.stdout.write('.')
				}
			}
		}

		applyMaskStroke(rc, mask.imgs, -CROP.left, -CROP.top)
		process.stdout.write('.')
		console.log()
	}

	console.log('saving')
	const outFPath = `${BASE_DIR}/map.png`
	const outStream = createWriteStream(outFPath)
	outCanvas.createPNGStream().pipe(outStream)
	await new Promise((res, rej) => outStream.on('finish', res).on('error', rej))

	console.log(`saved to ${relativeToCwd(outFPath)}`)
	console.log('done.')
})().catch(console.error)
