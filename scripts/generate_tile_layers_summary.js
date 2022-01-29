#!/usr/bin/env node
import { decodeLayerMask, encodeLayerMask } from '#lib/tiles/summary.js'
import { parseArgs, relativeToCwd } from '#lib/os.js'
import { promises as fs } from 'fs'
import { getChosenMapCode, OUT_TILES_DIR } from './_common.js'
import { forEachOutTileFPath, parseOutTileFPath } from '#lib/tiles/dirs.js'

//
;(async () => {
	const args = parseArgs()
	const mapCode = getChosenMapCode(args)

	checkEncDec(new Uint8Array([0]), 1, 1)
	checkEncDec(new Uint8Array([1]), 1, 1)

	checkEncDec(new Uint8Array([0, 1]), 2, 1)
	checkEncDec(new Uint8Array([1, 0]), 2, 1)

	checkEncDec(new Uint8Array([0, 0, 0, 0]), 2, 2)
	checkEncDec(new Uint8Array([1, 1, 1, 1]), 2, 2)
	checkEncDec(new Uint8Array([0, 0, 0, 1]), 2, 2)

	checkEncDec(new Uint8Array(256), 16, 16)
	checkEncDec(new Uint8Array(256).fill(1), 16, 16)

	checkEncDec(new Uint8Array(1024), 32, 32)
	checkEncDec(new Uint8Array(1024).fill(1), 32, 32)

	const levels = /**@type {Map<number,{i:number, j:number}[]>}*/ (new Map())
	await forEachOutTileFPath(OUT_TILES_DIR, mapCode, 'png', fpath => {
		const { level, i, j } = parseOutTileFPath(fpath)
		let item = levels.get(level)
		if (item) {
			item.push({ i, j })
		} else {
			levels.set(level, [{ i, j }])
		}
	})

	const contentLines = Array.from(levels.entries())
		.sort((a, b) => b[0] - a[0])
		.map(([level, items], i, arr) => {
			const left = Math.min(...items.map(x => x.i))
			const right = Math.max(...items.map(x => x.i))
			const top = Math.min(...items.map(x => x.j))
			const bottom = Math.max(...items.map(x => x.j))

			const width = right - left + 1
			const height = bottom - top + 1

			const mask = new Uint8Array(width * height)
			for (const { i, j } of items) {
				mask[i - left + (j - top) * width] = 1
			}
			// console.log([maxLevel, minLevel], width, height)
			// for (let j = top; j <= bottom; j++)
			// 	console.log(mask.slice((j - top) * width, (j - top + 1) * width) + '')

			checkEncDec(mask, width, height)

			return (
				JSON.stringify([level, [left, top, right, bottom], encodeLayerMask(mask)], null, '') +
				(i < arr.length - 1 ? ',' : '')
			)
		})

	const fpath = `${OUT_TILES_DIR}/${mapCode}/summary.json`
	await fs.writeFile(fpath, `[\n${contentLines.join('\n')}\n]`)
	console.log(`saved to ${relativeToCwd(fpath)}`)
})().catch(console.error)

/**
 * @param {Uint8Array} mask
 * @param {number} width
 * @param {number} height
 */
function checkEncDec(mask, width, height) {
	const str = encodeLayerMask(mask)
	const mask2 = decodeLayerMask(str, width * height)

	let areSame = true
	for (let i = 0; i < mask.length; i++)
		if (mask[i] !== mask2[i]) {
			areSame = false
			break
		}
	if (areSame) return

	for (let j = 0; j < height; j++) {
		const r0 = mask.subarray(j * width, (j + 1) * width).join('')
		const r1 = mask2.subarray(j * width, (j + 1) * width).join('')
		const same = r0 === r1
		console.error((j + '').padStart(3) + ' ' + (same ? ' ' : '!') + r0)
		if (r1 !== r0) console.error('    ' + (same ? ' ' : '!') + r1)
	}

	throw new Error(`masks are different: w=${width} h=${height} enc=${JSON.stringify(str)}`)
}
