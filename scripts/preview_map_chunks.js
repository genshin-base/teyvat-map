#!/usr/bin/env node
import { promises as fs } from 'fs'
import { relative } from 'path'
import { resize } from '#lib/media.js'
import { exists } from '#lib/os.js'
import { BASE_DIR } from './_common.js'
import { IN_TILES_CONFIG } from '../global_config.js'
import { forEachTileGroup, getChosenTilesMap, rawTileKey } from '#lib/tiles/raw.js'

const TILE_PREVIEW_SIZE = 256

const TMP_TILE_DIR = `${BASE_DIR}/tmp/preview_tiles`
const PAGE_DIR = TMP_TILE_DIR

;(async () => {
	await fs.mkdir(TMP_TILE_DIR, { recursive: true })

	const tilesConfig = IN_TILES_CONFIG
	if (tilesConfig.dirs.length === 0) {
		console.error('need some paths in "IN_TILES_CONFIG.dirs" in global_config.js')
		process.exit(1)
	}

	const chosenTiles = getChosenTilesMap(tilesConfig)

	const tileRows = []
	const tilesRect = await forEachTileGroup(tilesConfig, async (i, j, isRowStart, srcFPaths) => {
		if (isRowStart) tileRows.push([])

		const fpaths = []
		for (const fpath of srcFPaths) {
			const tmpFPath = `${TMP_TILE_DIR}/${i}_${j}_${fpaths.length}.png`
			if (!(await exists(tmpFPath))) {
				console.log(`processing ${tmpFPath}`)
				await resize(fpath, tmpFPath, TILE_PREVIEW_SIZE + '')
			}
			fpaths.push(relative(PAGE_DIR, tmpFPath))
		}

		const tileRow = tileRows[tileRows.length - 1]
		tileRow.push({ i, j, key: rawTileKey(i, j), fpaths })
	})

	console.log('generating page')
	const pagePath = `${PAGE_DIR}/index.html`
	const isHidden = (key, i) => (key in chosenTiles ? chosenTiles[key] !== i : i !== 0)
	await fs.writeFile(
		pagePath,
		`
<body>
<style>
table { border-collapse: collapse }
td { padding: 0 }
.chunk { position: relative }
.chunk .index { position: absolute }
.chunk .coords { position: absolute; top: 24px; color: #333 }
.chunk:not(:hover) .coords { display: none }
.chunk.multi .hidden { display: none }
</style>
<h3>tiles_config.js</h3>
<pre id="configBox"></pre>
<button onclick="delCol(0)">del first col</button>
<button onclick="delCol(-1)">del last col</button>
<button onclick="delRow(0)">del first row</button>
<button onclick="delRow(-1)">del last row</button>
<br>
<br>
<table id="tilesTable">
${tileRows
	.map(
		row =>
			'<tr>\n' +
			row
				.map(
					({ i, j, key, fpaths }) =>
						`  <td class="chunk ${fpaths.length > 1 ? 'multi' : ''}" data-key="${key}">\n` +
						`    <div class="index">.</div>\n` +
						`    <div class="coords">${i}:${j}</div>\n` +
						fpaths
							.map(
								(fpath, i) =>
									`    <img src="${fpath}" class="${isHidden(key, i) ? 'hidden' : ''}"/>\n`,
							)
							.join('') +
						`  </td>\n`,
				)
				.join('') +
			'</tr>\n',
	)
	.join('')}
</table>
</body>
<script>
const rect = ${JSON.stringify(tilesRect)}

function delCol(index) {
	for (const row of tilesTable.tBodies[0].rows) row.removeChild(Array.from(row.cells).at(index))
	if (index === 0) rect.left--; else rect.right++
	updateConfig()
}
function delRow(index) {
	tilesTable.tBodies[0].removeChild(Array.from(tilesTable.tBodies[0].rows).at(index))
	if (index === 0) rect.top--; else rect.bottom++
	updateConfig()
}

function updateMultiChunk(cell, delta) {
	const imgs = Array.from(cell.querySelectorAll('img'))
	let index = imgs.findIndex(x => !x.classList.contains('hidden'))
	for (const img of imgs) img.classList.add('hidden')
	index = (index + delta) % imgs.length
	imgs[index].classList.remove('hidden')
	cell.querySelector('.index').textContent = (index+1)+'/'+imgs.length
}

function updateConfig() {
	const cells = Array.from(tilesTable.querySelectorAll('.chunk.multi'))

	configBox.textContent = 'export const IN_TILES_CONFIG = ' +
		JSON.stringify({
			dirs: ${JSON.stringify(tilesConfig.dirs)},
			rect,
			choices: Array.from(tilesTable.tBodies[0].rows).map(row => Array.from(row.cells).map(cell => {
				const imgs = Array.from(cell.querySelectorAll('img'))
				const index = imgs.findIndex(x => !x.classList.contains('hidden'))
				return index<0 || imgs.length<=1 ? '.' : index.toString(10)
			}).join('')),
		}, null, '  ')
}

tilesTable.querySelectorAll('.chunk.multi').forEach(x => updateMultiChunk(x, 0))
updateConfig()

tilesTable.onclick = e => {
	const multiCell = e.target && e.target.closest('.chunk.multi')
	if (!multiCell) return
	updateMultiChunk(multiCell, 1)
	updateConfig()
}
</script>
`,
	)
	console.log(`done, file://${pagePath}`)
})().catch(console.error)
