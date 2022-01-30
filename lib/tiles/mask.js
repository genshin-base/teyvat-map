import { promises as fs } from 'fs'
import canvas from 'canvas'
const { loadImage, createCanvas } = canvas

/** @typedef {{side:'inner'|'outer'|'both', from:'fill'|'stroke', blur:number, color:string}} MaskShadow */
/** @typedef {{fill:import('canvas').Image, stroke:import('canvas').Image}} MaskImages */
/** @typedef {{enable:boolean, fpath:string, shadows:MaskShadow[]}} MaskConfig */
/** @typedef {{imgs:MaskImages, canvasBorder:number, shadows:MaskShadow[]}} Mask */

/**
 * @param {MaskConfig} cfg
 * @param {number} referenceTileSize
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Mask|null>}
 */
export async function prepareMask(cfg, referenceTileSize, width, height) {
	if (!cfg.enable) return null
	const strokeData = await fs.readFile(cfg.fpath, { encoding: 'utf-8' })
	const fillData = strokeData
		.replace(/(fill|stroke)="[^"]*"/g, '')
		.replace(/<path/g, '<path fill="black" stroke="none"')
	const fill = await loadImage(Buffer.from(fillData, 'utf-8'))
	const stroke = await loadImage(Buffer.from(strokeData, 'utf-8'))

	const shadows = cfg.shadows.map(x => ({ ...x, blur: (x.blur / 1024) * referenceTileSize }))

	const m = strokeData.match(/stroke-width="(\d+)"/)
	const strokeWidth = m ? parseInt(m[1]) : 1
	const canvasBorder = Math.max(
		0,
		...shadows
			.filter(x => x.side !== 'inner')
			.map(x => Math.ceil(1 + x.blur * 1.5 + (x.from === 'stroke' ? strokeWidth / 2 : 0))),
	)

	// без явного задания размеров
	// а) SVG рисуется пиксельно (мыльно)
	// б) SVG рисуется *ОЧЕНЬ* медленно
	fill.width = width
	fill.height = height
	stroke.width = width
	stroke.height = height
	return { imgs: { fill, stroke }, canvasBorder, shadows }
}

/**
 * @param {import('canvas').CanvasRenderingContext2D} outRC
 * @param {MaskImages} maskImgs
 * @param {number} x
 * @param {number} y
 */
export function applyMaskCrop(outRC, maskImgs, x, y) {
	outRC.globalCompositeOperation = 'destination-in'
	outRC.drawImage(maskImgs.fill, x, y)
	outRC.globalCompositeOperation = 'source-over'
}

/**
 * @param {import('canvas').CanvasRenderingContext2D} outRC
 * @param {MaskImages} maskImgs
 * @param {number} x
 * @param {number} y
 */
export function applyMaskStroke(outRC, maskImgs, x, y) {
	outRC.drawImage(maskImgs.stroke, x, y)
}

let maskShadowCanvasses = /**@type {{a:canvas.Canvas, b:canvas.Canvas}|null}*/ (null)
/**
 * @param {import('canvas').CanvasRenderingContext2D} outRC
 * @param {number} xApply
 * @param {number} yApply
 * @param {Mask} maskCfg
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */
export function applyMaskShadow(outRC, xApply, yApply, maskCfg, x, y, width, height) {
	xApply -= maskCfg.canvasBorder
	yApply -= maskCfg.canvasBorder
	x += maskCfg.canvasBorder
	y += maskCfg.canvasBorder

	const canvasWidth = width + maskCfg.canvasBorder * 2
	const canvasHeight = height + maskCfg.canvasBorder * 2
	if (!maskShadowCanvasses) {
		maskShadowCanvasses = {
			a: createCanvas(canvasWidth, canvasHeight),
			b: createCanvas(canvasWidth, canvasHeight),
		}
		maskShadowCanvasses.a.getContext('2d').quality = 'best'
		maskShadowCanvasses.b.getContext('2d').quality = 'best'
	}

	for (const c of Object.values(maskShadowCanvasses))
		if (c.width !== canvasWidth || c.height !== canvasHeight) {
			c.width = canvasWidth
			c.height = canvasHeight
		}

	const aRC = maskShadowCanvasses.a.getContext('2d')
	const bRC = maskShadowCanvasses.b.getContext('2d')

	for (const shadow of maskCfg.shadows) {
		aRC.clearRect(0, 0, aRC.canvas.width, aRC.canvas.height)
		bRC.clearRect(0, 0, bRC.canvas.width, bRC.canvas.height)

		// shadowBlur ОЧЕНЬ медленно работает при отрисовке больших SVG напрямую.
		// Гораздо быстрее отрисовать SVG на канвас, и блюрить уже его.
		bRC.drawImage(maskCfg.imgs[shadow.from], x, y)

		aRC.shadowBlur = shadow.blur
		aRC.shadowColor = shadow.color
		aRC.shadowOffsetX = aRC.canvas.width
		aRC.drawImage(bRC.canvas, -aRC.canvas.width, 0)
		aRC.shadowBlur = 0
		aRC.shadowOffsetX = 0

		if (shadow.side !== 'both') {
			aRC.globalCompositeOperation = shadow.side === 'outer' ? 'destination-out' : 'destination-in'
			aRC.drawImage(maskCfg.imgs.fill, x, y)
			aRC.globalCompositeOperation = 'source-over'
		}

		outRC.drawImage(aRC.canvas, xApply, yApply)
	}
}
