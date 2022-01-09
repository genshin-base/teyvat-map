/**
 * @typedef {[
 *   level: number,
 *   rect: [left:number, top:number, right:number, bottom:number],
 *   maskStr: string
 * ]} TileLayerSummary
 */

const COUNT_CHAR_FIRST = 35
const COUNT_CHAR_LAST = 125
const EXTRA_CHAR = 126

/** @param {Uint8Array} mask */
export function encodeLayerMask(mask) {
	let maskStr = ''
	let prevVal = 0
	let rangeStartI = 0
	for (let i = 0; i < mask.length; i++) {
		const delta = i - rangeStartI
		const isMaxLen = delta === COUNT_CHAR_LAST - COUNT_CHAR_FIRST
		const hasChanged = mask[i] !== prevVal
		if (hasChanged || isMaxLen) {
			maskStr += String.fromCharCode(hasChanged ? COUNT_CHAR_FIRST + delta : EXTRA_CHAR)
			prevVal = mask[i]
			rangeStartI = i
		}
	}
	const delta = mask.length - rangeStartI
	if (delta > 0) maskStr += String.fromCharCode(COUNT_CHAR_FIRST + delta)
	return maskStr
}

/**
 * @param {string} maskStr
 * @param {number} size
 */
export function decodeLayerMask(maskStr, size) {
	let mask = new Uint8Array(size)
	let val = 0
	let rangeStartI = 0
	let i, code, isExtra, rangeEndI
	for (i = 0; i < maskStr.length; i++) {
		code = maskStr.charCodeAt(i)
		isExtra = code === EXTRA_CHAR
		rangeEndI = rangeStartI + ((isExtra ? COUNT_CHAR_LAST : code) - COUNT_CHAR_FIRST)
		mask.fill(val, rangeStartI, rangeEndI)
		rangeStartI = rangeEndI
		val ^= /**@type {*}*/ (!isExtra)
	}
	return mask
}

/**
 * @param {TileLayerSummary[]} layersInfo
 * @returns {(x:number, y:number, z:number) => boolean}
 */
export function makeTileMaskChecker(layersInfo) {
	const level2func = /**@type {Map<number,(i:number, j:number) => boolean>}*/ (new Map())
	for (const item of layersInfo) {
		const [level, [left, top, right, bottom], maskStr] = item
		const width = right - left + 1
		const height = bottom - top + 1
		const mask = decodeLayerMask(maskStr, width * height)
		level2func.set(
			level,
			(i, j) =>
				i >= left && //
				i <= right &&
				j >= top &&
				j <= bottom &&
				!!mask[i - left + (j - top) * width],
		)
	}
	return (i, j, level) => !!level2func.get(level)?.(i, j)
}
