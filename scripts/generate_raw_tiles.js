#!/usr/bin/env node
import { createReadStream, createWriteStream } from 'fs'
import { PNG } from 'pngjs'
import { getChosenMapCode, OUT_RAW_TILES_DIR } from './_common.js'
import { PromisePool } from '#lib/utils.js'
import { parseArgs, recreateDir } from '#lib/os.js'
import { IN_TILES_CONFIG } from '../global_config.js'
import { optimizeInPlace } from '#lib/media.js'
import {
	forEachTileGroup,
	getChosenTilesMap,
	makeSavedRawTileFPath,
	makeSavedRawTilesDirPath,
	rawTileKey,
} from '#lib/tiles/raw.js'

/* === CONFIG === */

const OPTIMIZE = 3 //or false

/* === /CONFIG === */

;(async () => {
	const args = parseArgs()
	const mapCode = getChosenMapCode(args)

	const tilesConfig = IN_TILES_CONFIG[mapCode]
	if (tilesConfig.dirs.length === 0) {
		console.error('need some paths in "IN_TILES_CONFIG.dirs" in global_config.js')
		process.exit(1)
	}

	if (!tilesConfig.choices) console.warn(`WARN: cfg.choices not set, some tiles may be messed up`)
	if (!tilesConfig.rect) console.warn(`WARN: cfg.rect not set, some extra tiles may be generated`)

	const chosenTiles = getChosenTilesMap(tilesConfig)

	await recreateDir(makeSavedRawTilesDirPath(OUT_RAW_TILES_DIR, mapCode))

	const tasks = new PromisePool()

	const optimizationStats = { orig: 0, opt: 0 }

	console.log('reading tiles list...')
	await forEachTileGroup(tilesConfig, mapCode, async (i, j, isRowStart, srcFPaths, tilesRect) => {
		const w = tilesRect.left - tilesRect.right + 1
		const h = tilesRect.top - tilesRect.bottom + 1
		const n = tilesRect.left - i + 1 + w * (tilesRect.top - j)
		const total = w * h
		process.stdout.write(`processing ${n}/${total}...\r`)

		if (srcFPaths.length > 0) {
			const index = chosenTiles[rawTileKey(i, j)] ?? 0
			const srcFPath = srcFPaths[index]
			const outFPath = makeSavedRawTileFPath(OUT_RAW_TILES_DIR, mapCode, i, j)

			const stripAplha = new Promise((res, rej) => {
				const ws = createWriteStream(outFPath)
				createReadStream(srcFPath)
					.pipe(new PNG({ colorType: 2 }))
					.on('parsed', function () {
						const pix = this.data
						for (let i = 3; i < pix.length; i += 4) pix[i] = 255
						this.pack().pipe(ws)
					})
				ws.on('finish', res).on('error', rej)
			})

			await tasks.add(
				stripAplha.then(() => OPTIMIZE && optimizeInPlace(outFPath, OPTIMIZE, optimizationStats)),
			)
		}
	})
	await tasks.end()
	console.log()

	if (OPTIMIZE) {
		const perc = (100 * optimizationStats.opt) / optimizationStats.orig
		console.log(`png optimization rate: ${perc.toFixed(1)}%`)
	}
	console.log('done.')
})().catch(console.error)
