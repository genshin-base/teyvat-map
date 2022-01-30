import {
	LocMap,
	ControlLayer,
	SmoothTileContainer,
	TileLayer,
	drawRectTilePlaceholder,
	loadTileImage,
	URLLayer,
} from 'locmap'
import { makeTileMaskChecker } from '#lib/tiles/summary'

const TILE_DRAW_WIDTH = 192
const TILE_CONTENT_WIDTH = 256 //tile width in game pixels on layer 0

const mapConfig = /**@type {*} */ (window).mapConfig

let tilesExt = 'jpg'
let tilesGroup = 'teyvat'
/** @type {Record<string, ReturnType<typeof makeTileMaskChecker>>} */
let tilesMask = {}

fetch(`../tiles/summary.json`)
	.then(r => r.json())
	.then(info => {
		for (const code in info) tilesMask[code] = makeTileMaskChecker(info[code])
	})

/** @type {import('locmap').TilePlaceholderDrawFunc} */
function drawTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale) {
	const mask = tilesMask[tilesGroup]
	if (mask && !mask(x, y, z)) return null
	drawRectTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale)
}

const innerTileLoad = loadTileImage(
	(x, y, z) => `../tiles/${tilesGroup}/${tilesExt}/${z}/${x}/${y}.${tilesExt}`,
)
/** @type {import('locmap').TileImgLoadFunc} */
function loadTile(x, y, z, onUpdate) {
	const mask = tilesMask[tilesGroup]
	if (mask && !mask(x, y, z)) return null
	innerTileLoad(x, y, z, onUpdate)
}

/** @type {import('locmap').ProjectionConverter} */
const ProjectionFlat = {
	x2lon(x, zoom) {
		return (x / zoom) * TILE_CONTENT_WIDTH
	},
	y2lat(y, zoom) {
		return (y / zoom) * TILE_CONTENT_WIDTH
	},

	lon2x(lon, zoom) {
		return (lon * zoom) / TILE_CONTENT_WIDTH
	},
	lat2y(lat, zoom) {
		return (lat * zoom) / TILE_CONTENT_WIDTH
	},

	meters2pixCoef(lat, zoom) {
		return zoom / TILE_CONTENT_WIDTH
	},
}

checkAvifSupport().then(avifIsSupported => {
	if (avifIsSupported) {
		if (location.hash.includes('jpg')) {
			alert(`avif is supported, but forcing ${tilesExt}`)
		} else {
			tilesExt = 'avif'
		}
	} else {
		alert(`avif seems not supported :(\nusing ${tilesExt}`)
	}

	tilesGroup = mapConfig['map-code'].value
	mapConfig.onchange = () => {
		tilesGroup = mapConfig['map-code'].value
		tileContainer.clearCache()
		map.requestRedraw()
	}

	const map = new LocMap(document.body, ProjectionFlat)
	const tileContainer = new SmoothTileContainer(TILE_DRAW_WIDTH, loadTile, drawTilePlaceholder)
	map.setZoomRange(8, 512)
	map.updateLocation(0, 0, 64 * 1.2)
	map.register(new TileLayer(tileContainer))
	map.register(new ControlLayer())
	map.register(new URLLayer(0, 2))
	map.requestRedraw()
	map.resize()
	window.onresize = map.resize
})

function checkAvifSupport() {
	return new Promise(resolve => {
		const img = new Image()
		img.src =
			'data:image/avif;base64,AAAAGGZ0eXBhdmlmAAAAAG1pZjFtaWFmAAAA621ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABCwAAABYAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgSAAAAAAABNjb2xybmNseAABAA0ABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB5tZGF0EgAKBzgADlAQ0GkyCRAAAAAP+j9P4w=='
		img.onload = () => resolve(true)
		img.onerror = () => resolve(false)
	})
}
