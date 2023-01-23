import { render } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { html } from 'htm/preact'
import { createPortal as createPortal_ } from '../node_modules/preact/compat/src/portals'
import { getChosenTilesMap, rawManualTileKey, rawGridTileKey } from '#lib/tiles/raw.js'

const createPortal = /**@type {import("preact/compat").createPortal}*/ (createPortal_)

/** @type {import('../scripts/generate_map_chunks_preview').PreviewPageParams} */
const tilesData = /**@type {*}*/ (window)._params

const mapCode = tilesData.mapCode
const tilesConfig = tilesData.tilesConfig

// @ts-ignore
const defaultChoices = Array(tilesConfig.rect.top - tilesConfig.rect.bottom)
	.fill(0)
	.map((x, i) =>
		// @ts-ignore
		'.'.repeat(tilesConfig.rect.top - tilesConfig.rect.bottom),
	)

/**
 * @param {{
 *   rect: import('#lib/tiles/raw').TilesRect,
 *   choices: string[],
 *   manualTiles: import('#lib/tiles/raw').ManualTileConfig[],
 *   onDelCol: (i:number) => unknown,
 *   onDelRow: (i:number) => unknown,
 * }} params
 */
function TilesConfig({ rect, choices, manualTiles, onDelCol, onDelRow }) {
	const cfg = {
		...tilesConfig,
		rect,
		choices,
		manual:
			manualTiles.length === 0
				? undefined
				: manualTiles.map(m => ({
						...m,
						x: `{raw}${(m.x * 1024).toFixed(0)} / 1024{/raw}`,
						y: `{raw}${(m.y * 1024).toFixed(0)} / 1024{/raw}`,
				  })),
	}
	return html`
		<h3>tiles_config.js</h3>
		<pre>
export const IN_TILES_CONFIG = {
  ${'\n' +
			(mapCode + ': ' + JSON.stringify(cfg, null, '  '))
				.replace(/"{raw}(.*){\/raw}"/g, '$1')
				.split('\n')
				.map(x => '  ' + x)
				.join('\n')},
...
		</pre
		>
		<div>
			<button onclick=${() => onDelCol(0)}>del first col</button>
			<button onclick=${() => onDelCol(-1)}>del last col</button>
			<button onclick=${() => onDelRow(0)}>del first row</button>
			<button onclick=${() => onDelRow(-1)}>del last row</button>
		</div>
	`
}

/**
 * @param {{
 *   tile: import('../scripts/generate_map_chunks_preview').PreviewPageTile
 *   onClose: () => unknown,
 * }} params
 */
function TileDetails({ tile, onClose }) {
	useEffect(() => {
		function onKey(/**@type {KeyboardEvent}*/ e) {
			if (e.key === 'Escape') onClose()
		}
		addEventListener('keydown', onKey)
		return () => removeEventListener('keydown', onKey)
	}, [])

	return createPortal(
		html`<div
			class="tile-details-wrap"
			onclick=${e => e.target.classList.contains('tile-details-wrap') && onClose()}
		>
			<div class="tile-details">
				<div>key: ${tile.key}</div>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>Tile</th>
							<th>Diff</th>
						</tr>
					</thead>
					${tile.fpaths.map(
						(x, i) =>
							html`<tr>
								<td>${i + 1}</td>
								<td><img src=${x} /></td>
								<td class="diff">
									${i > 0 && html`<img src=${x} /><img src=${tile.fpaths[i - 1]} />`}
								</td>
							</tr>`,
					)}
				</table>
			</div>
		</div>`,
		document.body,
	)
}

/**
 * @param {{
 *   tile: import('../scripts/generate_map_chunks_preview').PreviewPageTile
 *   chosenTiles: Record<string, number>,
 *   manualTiles: import('#lib/tiles/raw').ManualTileConfig[],
 *   onChoose: (index:number) => number,
 *   onManualMoveRelative?: (dx:number, dy:number) => number,
 * }} params
 */
function Tile({ tile, chosenTiles, manualTiles, onChoose, onManualMoveRelative }) {
	const [showDetails, setShowDetails] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const elemRef = useRef(/**@type {HTMLElement|null}*/ (null))

	const chosenIndex = chosenTiles[tile.key] ?? 0
	const fpath = tile.fpaths[chosenIndex] ?? tile.fpaths[0]

	const onMoveRef = useRef(onManualMoveRelative)
	onMoveRef.current = onManualMoveRelative
	useEffect(() => {
		if (tile.ref.type !== 'manual' || !onMoveRef.current) return
		if (!elemRef.current) return
		const elem = elemRef.current

		function onKeyDown(/**@type {KeyboardEvent}*/ e) {
			if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()

			const d = (1 / 1024) * (e.shiftKey ? 20 : 1)
			if (e.key === 'ArrowUp') onMoveRef.current?.(0, -d)
			else if (e.key === 'ArrowDown') onMoveRef.current?.(0, d)
			else if (e.key === 'ArrowLeft') onMoveRef.current?.(-d, 0)
			else if (e.key === 'ArrowRight') onMoveRef.current?.(d, 0)
		}
		function onMouseEnter() {
			setIsHovered(true)
			addEventListener('keydown', onKeyDown)
		}
		function onMouseLeave() {
			setIsHovered(false)
			removeEventListener('keydown', onKeyDown)
		}

		elem.addEventListener('mouseenter', onMouseEnter)
		elem.addEventListener('mouseleave', onMouseLeave)
		return () => {
			elem.removeEventListener('mouseenter', onMouseEnter)
			elem.removeEventListener('mouseleave', onMouseLeave)
			removeEventListener('keydown', onKeyDown)
		}
	}, [tile.ref])

	const onClick =
		tile.fpaths.length <= 1
			? null
			: e => e.target.tagName === 'IMG' && onChoose((chosenIndex + 1) % tile.fpaths.length)

	const style =
		tile.ref.type === 'manual'
			? {
					left: tilesData.origin.x + manualTiles[tile.ref.index].x * tilesData.tileSize + 'px',
					top: tilesData.origin.y + manualTiles[tile.ref.index].y * tilesData.tileSize + 'px',
			  }
			: {}

	return html`<div
		ref=${elemRef}
		class=${'tile' +
		(tile.ref.type === 'manual' ? ' absolute' : '') +
		(tile.fpaths.length > 1 ? ' switchable' : '')}
		style=${style}
		onclick=${onClick}
	>
		${fpath && html`<img src=${fpath} />`}
		<div class="menu">
			<div class="index">
				${tile.fpaths.length <= 1 ? '.' : `${chosenIndex + 1}/${tile.fpaths.length}`}
				${isHovered ? 'use arrow keys' : ''}
			</div>
			<div class="coords">${tile.ref.type === 'grid' ? tile.key : ''}</div>
			<button class="diff-btn" onclick=${() => setShowDetails(x => !x)}>diff</button>
		</div>
		${showDetails && html`<${TileDetails} tile=${tile} onClose=${() => setShowDetails(false)} />`}
	</div>`
}

/**
 * @param {{
 *   tiles: import('../scripts/generate_map_chunks_preview').PreviewPageParams["key2tile"],
 *   rect: import('#lib/tiles/raw').TilesRect,
 *   chosenTiles: Record<string, number>,
 *   manualTiles: import('#lib/tiles/raw').ManualTileConfig[],
 *   onChoose: (tile:import('../scripts/generate_map_chunks_preview').PreviewPageTile, index:number) => unknown,
 *   onManualMove: (tile:import('../scripts/generate_map_chunks_preview').PreviewPageTile, x:number, y:number) => unknown,
 * }} params
 */
function TilesWrap({ tiles, rect, chosenTiles, manualTiles, onChoose, onManualMove }) {
	const [showInfo, setShowInfo] = useState(false)

	const rows = []
	for (let j = rect.top; j >= rect.bottom; j--) {
		const cells = []
		for (let i = rect.left; i >= rect.right; i--) {
			const tile = tiles[rawGridTileKey(i, j)]
			const elem =
				tile &&
				html`<${Tile}
					key=${tile.key}
					tile=${tile}
					chosenTiles=${chosenTiles}
					manualTiles=${manualTiles}
					onChoose=${i => onChoose(tile, i)}
				/>`
			cells.push(html`<td>${elem}</td>`)
		}
		rows.push(
			html`<tr key=${j}>
				${cells}
			</tr>`,
		)
	}

	const absTiles = manualTiles.map((x, i) => {
		const tile = tiles[rawManualTileKey(i)]
		return (
			tile &&
			html`<${Tile}
				key=${tile.key}
				tile=${tile}
				chosenTiles=${chosenTiles}
				manualTiles=${manualTiles}
				onChoose=${i => onChoose(tile, i)}
				onManualMoveRelative=${(dx, dy) => onManualMove(tile, x.x + dx, x.y + dy)}
			/>`
		)
	})

	useEffect(() => {
		function onPress(/**@type {KeyboardEvent}*/ e) {
			if (e.key === 'i') setShowInfo(x => !x)
		}
		addEventListener('keypress', onPress)
		return () => removeEventListener('keypress', onPress)
	}, [])

	return html`
		<div class=${'tiles-wrap' + (showInfo ? ' extra-info' : '')}>
			<div style="position:absolute; top:0; left:0"><code>I</code> — toggle extra info</div>
			<table id="tilesTable">
				${rows}
			</table>
			${absTiles}
		</div>
	`
}

function Styles() {
	return html`
		<style>
			table {
				border-collapse: collapse;
			}
			td {
				padding: 0;
			}
			.tiles-wrap {
				position: relative;
				margin-top: 48px;
			}
			.tile {
				position: relative;
			}
			.tile.absolute {
				position: absolute;
			}
			.tiles-wrap.extra-info .tile {
				outline: 1px solid white;
			}
			.tiles-wrap.extra-info .tile:hover::after {
				content: ' ';
				position: absolute;
				z-index: 4;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				outline: 2px solid white;
				pointer-events: none;
			}
			.tile img {
				display: block;
			}
			.tile.switchable img {
				cursor: pointer;
			}
			.tiles-wrap.extra-info .tile:not(.switchable) img {
				opacity: 0.5;
			}
			.tile .menu {
				position: absolute;
				z-index: 4;
				left: 0;
				top: 0;
				padding: 3px;
				border-radius: 3px;
			}
			.tiles-wrap.extra-info .menu {
				background-color: #fff7;
			}
			.tile .index {
				font-family: monospace;
				text-shadow: 0 0 3px #fff7;
			}
			.tiles-wrap:not(.extra-info) .tile .index {
				font-size: 125%;
			}
			.tile .coords {
				font-family: monospace;
				color: #333;
			}
			.tile .diff-btn {
				text-decoration: underline;
				border: none;
				padding: 0;
				background: none;
				cursor: pointer;
			}
			.tiles-wrap:not(.extra-info) .coords,
			.tiles-wrap:not(.extra-info) .diff-btn {
				display: none;
			}
			.tile-details-wrap {
				position: fixed;
				z-index: 10;
				left: 0;
				top: 0;
				width: 100vw;
				height: 100vh;
				display: flex;
				justify-content: center;
				align-items: center;
				background-color: #0007;
			}
			.tile-details {
				padding: 16px;
				background-color: white;
				border-radius: 3px;
				max-width: 90vw;
				max-height: 90vh;
				overflow: auto;
				overscroll-behavior: contain;
			}
			.tile-details .diff {
				position: relative;
				filter: brightness(3500%);
			}
			.tile-details .diff img {
				background-color: white; /*otherwise opacity will affect the difference*/
			}
			.tile-details .diff img:not(:first-of-type) {
				position: absolute;
				left: 0;
				top: 0;
				mix-blend-mode: difference;
			}
		</style>
	`
}

function App() {
	if (!tilesConfig.rect) return null
	const [rect, setRect] = useState(tilesConfig.rect)
	const [choices, setChoices] = useState(tilesConfig.choices ?? defaultChoices)
	const [manualTiles, setManualTiles] = useState(tilesConfig.manual ?? [])

	const chosenTiles = getChosenTilesMap({ ...tilesConfig, choices, manual: manualTiles })

	function delCol(index) {
		if (!tilesConfig.rect || !tilesConfig.choices) return
		const newRect = { ...rect }
		const newChoices = [...choices]
		if (index === 0) {
			newRect.left--
			newChoices.forEach((x, i, a) => (a[i] = x.slice(1)))
		} else {
			newRect.right++
			newChoices.forEach((x, i, a) => (a[i] = x.slice(0, -1)))
		}
		setRect(newRect)
		setChoices(newChoices)
	}
	function delRow(index) {
		const newRect = { ...rect }
		const newChoices = [...choices]
		if (index === 0) {
			newRect.top--
			newChoices.shift()
		} else {
			newRect.bottom++
			newChoices.pop()
		}
		setRect(newRect)
		setChoices(newChoices)
	}

	/**
	 * @param {import('../scripts/generate_map_chunks_preview').PreviewPageTile} tile
	 * @param {number} index
	 */
	function chooseImg(tile, index) {
		if (tile.ref.type === 'grid') {
			let { i, j } = tile.ref
			i = rect.left - i
			j = rect.top - j
			const nc = choices.slice()
			for (let jj = 0; jj < rect.top - rect.bottom; jj++)
				if (!nc[jj]) nc[jj] = '.'.repeat(rect.left - rect.right)
			nc[j] = nc[j].slice(0, i) + index + nc[j].slice(i + 1)
			setChoices(nc)
		} else {
			const mt = manualTiles.slice()
			mt[tile.ref.index] = { ...mt[tile.ref.index], choice: index }
			setManualTiles(mt)
		}
	}

	/**
	 * @param {import('../scripts/generate_map_chunks_preview').PreviewPageTile} tile
	 * @param {number} x
	 * @param {number} y
	 */
	function moveManualTile(tile, x, y) {
		if (tile.ref.type !== 'manual') throw new Error(`${tile.ref.type} tile can not be moved`)
		const mt = manualTiles.slice()
		mt[tile.ref.index] = { ...mt[tile.ref.index], x, y }
		setManualTiles(mt)
	}

	return html`
		<${Styles} />
		<${TilesConfig}
			rect=${rect}
			choices=${choices}
			manualTiles=${manualTiles}
			onDelRow=${delRow}
			onDelCol=${delCol}
		/>
		<${TilesWrap}
			tiles=${tilesData.key2tile}
			rect=${rect}
			chosenTiles=${chosenTiles}
			manualTiles=${manualTiles}
			onChoose=${chooseImg}
			onManualMove=${moveManualTile}
		/>
	`
}

render(html`<${App} />`, document.body)
