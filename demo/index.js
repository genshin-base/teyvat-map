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

const TILE_WIDTH = 192

let tileExt = 'jpg'
let tilesMask = /**@type {ReturnType<typeof makeTileMaskChecker>|null}*/ (null)

fetch('../tiles/summary.json')
	.then(r => r.json())
	.then(info => {
		tilesMask = makeTileMaskChecker(info)
	})

/** @type {import('locmap').TilePlaceholderDrawFunc} */
function drawTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale) {
	if (tilesMask && !tilesMask(x, y, z)) return null
	drawRectTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale)
}

const innerTileLoad = loadTileImage((x, y, z) => `../tiles/${tileExt}/${z}/${x}/${y}.${tileExt}`)
/** @type {import('locmap').TileImgLoadFunc} */
function loadTile(x, y, z, onUpdate) {
	if (tilesMask && !tilesMask(x, y, z)) return null
	innerTileLoad(x, y, z, onUpdate)
}

/** @type {import('locmap').ProjectionConverter} */
const ProjectionFlat = {
	x2lon(x, zoom) {
		return (x / zoom) * TILE_WIDTH
	},
	y2lat(y, zoom) {
		return (y / zoom) * TILE_WIDTH
	},

	lon2x(lon, zoom) {
		return (lon * zoom) / TILE_WIDTH
	},
	lat2y(lat, zoom) {
		return (lat * zoom) / TILE_WIDTH
	},

	meters2pixCoef(lat, zoom) {
		return zoom / TILE_WIDTH
	},
}

checkAvifSupport().then(avifIsSupported => {
	if (avifIsSupported) {
		if (location.hash === '#jpg') {
			alert(`avif is supported, but forcing ${tileExt}`)
		} else {
			tileExt = 'avif'
		}
	} else {
		alert(`avif seems not supported :(\nusing ${tileExt}`)
	}

	const map = new LocMap(document.body, ProjectionFlat)
	map.setZoomRange(8, 512)
	map.updateLocation(0, 0, 64 * 1.2)
	map.register(new TileLayer(new SmoothTileContainer(TILE_WIDTH, loadTile, drawTilePlaceholder)))
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
