#!/usr/bin/env node
import { promises as fs } from 'fs'
import { relative } from 'path'
import { rollup } from 'rollup'
import { resize } from '#lib/media.js'
import { exists, parseArgs } from '#lib/os.js'
import { BASE_DIR, getChosenMapCode } from './_common.js'
import { IN_TILES_CONFIG, MAP_ORIGINS } from '../global_config.js'
import { forEachTileGroup } from '#lib/tiles/raw.js'

/* === CONFIG === */

const TILE_PREVIEW_SIZE = 256

/* === /CONFIG === */

/** @typedef {{ref:import('#lib/tiles/raw').RawTileReference, key:string, fpaths:string[]}} PreviewPageTile */
/**
 * @typedef {{
 *   mapCode: import('#lib/tiles/raw').MapCode,
 *   tilesConfig: import('#lib/tiles/raw').TilesConfig
 *   key2tile: Record<string, PreviewPageTile>,
 *   origin: {x:number, y:number},
 *   tileSize: number,
 * }} PreviewPageParams
 */

const args = parseArgs()
const mapCode = getChosenMapCode(args)

const TMP_TILE_DIR = `${BASE_DIR}/tmp/preview_tiles/${mapCode}`
const PAGE_DIR = TMP_TILE_DIR

;(async () => {
	await fs.mkdir(TMP_TILE_DIR, { recursive: true })

	const tilesConfig = IN_TILES_CONFIG[mapCode]
	if (tilesConfig.dirs.length === 0) {
		console.error('need some paths in "IN_TILES_CONFIG.dirs" in global_config.js')
		process.exit(1)
	}

	const mapOrigin = MAP_ORIGINS[mapCode]

	console.log('searching files')
	const tilesMap = /**@type {PreviewPageParams["key2tile"]}*/ ({})
	const tilesRect = await forEachTileGroup(tilesConfig, mapCode, async (ref, srcFPaths) => {
		const fpaths = []
		for (const fpath of srcFPaths) {
			const tmpFPath = `${TMP_TILE_DIR}/${ref.key}_${fpaths.length}.png`
			if (!(await exists(tmpFPath))) {
				console.log(`processing ${tmpFPath}`)
				await resize(fpath, tmpFPath, TILE_PREVIEW_SIZE + '')
			}
			fpaths.push(relative(PAGE_DIR, tmpFPath))
		}
		tilesMap[ref.key] = { ref, key: ref.key, fpaths }
	})
	const foundCount = Object.values(tilesMap)
		.map(x => x.fpaths)
		.flat().length
	if (foundCount === 0) {
		console.error(`could not find any map tiles in: \n` + tilesConfig.dirs.map(x => '  ' + x).join('\n'))
		process.exit(1)
	}

	console.log('generating page')
	const rollupCfg = (await import('../map_chunks_preview/rollup.config.js')).default
	rollupCfg.output.file = `${PAGE_DIR}/bundle.js`
	const bundle = await rollup(rollupCfg)
	await bundle.write(rollupCfg.output)

	/** @type {PreviewPageParams} */
	const pageParams = {
		mapCode,
		tilesConfig: { ...tilesConfig, rect: tilesRect },
		key2tile: tilesMap,
		origin: {
			x: (tilesRect.left - mapOrigin.tile.i + mapOrigin.offset.x) * TILE_PREVIEW_SIZE,
			y: (tilesRect.top - mapOrigin.tile.j + mapOrigin.offset.y) * TILE_PREVIEW_SIZE,
		},
		tileSize: TILE_PREVIEW_SIZE,
	}

	function reAsStr(key, val) {
		return val instanceof RegExp ? `{raw}${val}{/raw}` : val
	}

	await fs.writeFile(
		`${PAGE_DIR}/index.html`,
		`
<html>
	<head>
		<title>Map Chunks Preview</title>
		<meta charset="utf-8" />
	</head>
	<body>
		<script>window._params = ${JSON.stringify(pageParams, reAsStr)}</script>
		<script src="bundle.js"></script>
	</body>
</html>
`,
	)

	// 	const pagePath = `${PAGE_DIR}/index.html`
	// 	const isHidden = (key, i) => (key in chosenTiles ? chosenTiles[key] !== i : i !== 0)
	// 	await fs.writeFile(
	// 		pagePath,
	// 		`
	// <meta charset="utf-8" />
	// <body>
	// <style>
	// table { border-collapse: collapse }
	// td { padding: 0 }
	// .chunk { position: relative }
	// .chunk .index { position: absolute }
	// .chunk .coords { position: absolute; top: 24px; color: #333 }
	// .chunk:not(:hover) .coords { display: none }
	// .chunk.multi .hidden { display: none }
	// </style>
	// <h3>tiles_config.js</h3>
	// <pre id="configBox"></pre>
	// <button onclick="delCol(0)">del first col</button>
	// <button onclick="delCol(-1)">del last col</button>
	// <button onclick="delRow(0)">del first row</button>
	// <button onclick="delRow(-1)">del last row</button>
	// <br>
	// <br>
	// <table id="tilesTable">
	// ${tileRows
	// 	.map(
	// 		row =>
	// 			'<tr>\n' +
	// 			row
	// 				.map(
	// 					({ i, j, key, fpaths }) =>
	// 						`  <td class="chunk ${fpaths.length > 1 ? 'multi' : ''}" data-key="${key}">\n` +
	// 						`    <div class="index">.</div>\n` +
	// 						`    <div class="coords">${i}:${j}</div>\n` +
	// 						fpaths
	// 							.map(
	// 								(fpath, i) =>
	// 									`    <img src="${fpath}" class="${isHidden(key, i) ? 'hidden' : ''}"/>\n`,
	// 							)
	// 							.join('') +
	// 						`  </td>\n`,
	// 				)
	// 				.join('') +
	// 			'</tr>\n',
	// 	)
	// 	.join('')}
	// </table>
	// </body>
	// <script>
	// const rect = ${JSON.stringify(tilesRect)}

	// function delCol(index) {
	// 	for (const row of tilesTable.tBodies[0].rows) row.removeChild(Array.from(row.cells).at(index))
	// 	if (index === 0) rect.left--; else rect.right++
	// 	updateConfig()
	// }
	// function delRow(index) {
	// 	tilesTable.tBodies[0].removeChild(Array.from(tilesTable.tBodies[0].rows).at(index))
	// 	if (index === 0) rect.top--; else rect.bottom++
	// 	updateConfig()
	// }

	// function updateMultiChunk(cell, delta) {
	// 	const imgs = Array.from(cell.querySelectorAll('img'))
	// 	let index = imgs.findIndex(x => !x.classList.contains('hidden'))
	// 	if (index === -1) index = 0
	// 	for (const img of imgs) img.classList.add('hidden')
	// 	index = (index + delta) % imgs.length
	// 	imgs[index].classList.remove('hidden')
	// 	cell.querySelector('.index').textContent = (index+1)+'/'+imgs.length
	// }

	// function updateConfig() {
	// 	const cells = Array.from(tilesTable.querySelectorAll('.chunk.multi'))

	// 	configBox.textContent = 'export const IN_TILES_CONFIG = {\\n' +
	// 		(
	// 			'${mapCode}: '+
	// 			JSON.stringify({
	// 				dirs: ${JSON.stringify(tilesConfig.dirs)},
	// 				rect,
	// 				choices: Array.from(tilesTable.tBodies[0].rows).map(row => Array.from(row.cells).map(cell => {
	// 					const imgs = Array.from(cell.querySelectorAll('img'))
	// 					const index = imgs.findIndex(x => !x.classList.contains('hidden'))
	// 					return index<0 || imgs.length<=1 ? '.' : index.toString(10)
	// 				}).join('')),
	// 			}, null, '  ')
	// 		).split('\\n').map(x => '  '+x).join('\\n') + ',\\n...'
	// }

	// tilesTable.querySelectorAll('.chunk.multi').forEach(x => updateMultiChunk(x, 0))
	// updateConfig()

	// tilesTable.onclick = e => {
	// 	const multiCell = e.target && e.target.closest('.chunk.multi')
	// 	if (!multiCell) return
	// 	updateMultiChunk(multiCell, 1)
	// 	updateConfig()
	// }
	// </script>
	// `,
	// 	)
	// console.log(`done, file://${pagePath}`)

	console.log(`done, file://${PAGE_DIR}/index.html`)
})().catch(console.error)
