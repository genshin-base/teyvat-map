#!/usr/bin/env node
import { createReadStream, promises as fs } from 'fs'
import { PNG } from 'pngjs'
import { runCmd } from '#lib/media.js'
import { mustBeNotNull, PromisePool } from '#lib/utils.js'
import { parseArgs, readAllStream, recreateDir, relativeToCwd } from '#lib/os.js'
import { dirname } from 'path'
import {
	forEachOutTileFPath,
	makeOutTilePath,
	makeOutTilesDirPath,
	parseOutTileFPath,
} from '#lib/tiles/dirs.js'
import { getChosenMapCode, OUT_TILES_DIR } from './_common.js'

/* === CONFIG === */

const FORMATS = ['jpg', 'avif']

const BG_COLOR = { r: 0, g: 0, b: 0 }

const CJPEG_ARGS = ['-quality', '78', '-optimize', '-sample', '2x2', '-tune-ssim']

// speed tiles time size
//  0     26  108.9 323341
//  1     26   45.3 325924
//  2     26   40.0 325886
//  3     26   26.4 328009
//  4     26   16.6 334516
const AVIFENC_ARGS = [
	['--speed', '0'], //0-10
	['-a', 'cq-level=12'], //quality 0-63
	['-a', 'end-usage=q'],
	['-a', 'tune=ssim'],
	['--min', '0'], //upper quality limit 0-63
	['--max', '8'], //lower quality limit 0-63
	['--cicp', '1/13/6'], //'1/13/0' for RGB mode
].flat()
const AVIF_CHROMA_SUBSAMPLING = true

/* === /CONFIG === */

//
;(async () => {
	const args = parseArgs()
	const mapCode = getChosenMapCode(args)

	const fpaths = []
	await forEachOutTileFPath(OUT_TILES_DIR, mapCode, 'png', fpath => fpaths.push(fpath))

	if (FORMATS.includes('jpg')) {
		const cjpeg = runCmd('cjpeg', ['-version'], {
			env: process.env,
			stdio: ['inherit', 'inherit', 'pipe'],
		})
		const version = (await readAllStream(mustBeNotNull(cjpeg.process.stderr))).toString('utf-8').trim()
		if (!version.startsWith('mozjpeg')) {
			console.warn(`WARN: better use MozJPEG, current cjpeg binary is: ${version || '<no-version>'}`)
			console.warn(`WARN: maybe with:`)
			console.warn(`WARN:   env PATH="/path/to/mozjpeg/bin:$PATH" ./${relativeToCwd(process.argv[1])}`)
			for (let i = 0; i < CJPEG_ARGS.length; i++) {
				const arg = CJPEG_ARGS[i]
				if (arg.startsWith('-tune-')) {
					console.warn(`WARN: disabling cjpeg flag ${arg}`)
					CJPEG_ARGS.splice(i--, 1)
				}
			}
		}
	}

	for (const ext of FORMATS) {
		await recreateDir(makeOutTilesDirPath(OUT_TILES_DIR, mapCode, ext))
	}

	const tasks = new PromisePool()

	for (let fileI = 0; fileI < fpaths.length; fileI++) {
		const fpath = fpaths[fileI]

		{
			const perc = ((100 * (fileI + 1)) / fpaths.length).toFixed(0)
			process.stdout.write(`processing ${fileI + 1}/${fpaths.length} ${perc}%...\r`)
		}

		const img = await new Promise((res, rej) => {
			const rs = createReadStream(fpath)
			rs.pipe(new PNG())
				.on('parsed', function () {
					res(this)
				})
				.on('error', rej)
			rs.on('error', rej)
		})

		const { level, i, j } = parseOutTileFPath(fpath)

		for (const ext of FORMATS) {
			const outFPath = makeOutTilePath(OUT_TILES_DIR, mapCode, level, i, j, ext)
			await fs.mkdir(dirname(outFPath), { recursive: true })

			await tasks.add(
				(async () => {
					if (ext === 'jpg') {
						const cjpeg = runCmd('cjpeg', [...CJPEG_ARGS, '-outfile', outFPath], {
							stdio: ['pipe', 'inherit', 'inherit'],
						})
						const stdin = mustBeNotNull(cjpeg.process.stdin)
						await writeBmp24(stdin, img.width, img.height, img.data)
						stdin.end()
						await cjpeg.promise
					}

					if (ext === 'avif') {
						const avifenc = runCmd('avifenc', ['--stdin', ...AVIFENC_ARGS, outFPath], {
							stdio: ['pipe', 'ignore', 'inherit'],
						})
						const stdin = mustBeNotNull(avifenc.process.stdin)
						await writeY4m444(stdin, img.width, img.height, img.data, AVIF_CHROMA_SUBSAMPLING)
						stdin.end()
						await avifenc.promise
					}
				})(),
			)
		}

		// const ws = createWriteStream('t.y4m')
		// await writeY4m444(ws, img.width, img.height, img.data)
		// await new Promise((res, rej) => ws.on('finish', res).on('error', rej))

		// if (fileI > 20) break
	}
	await tasks.end()
	console.log()
	console.log('done.')
})().catch(console.error)

/**
 * @param {import('stream').Writable} ws
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgba
 * @param {boolean} chromaSubsampling
 * @returns {Promise<void>}
 */
function writeY4m444(ws, width, height, rgba, chromaSubsampling) {
	if (chromaSubsampling && (width % 2 === 1 || height % 2 === 1))
		throw new Error(`can not subsample odd size (${width}x${height})`)

	const fixFmt = chromaSubsampling ? '420' : '444'
	ws.write(`YUV4MPEG2 W${width} H${height} F25:1 Ip A1:1 C${fixFmt} XCOLORRANGE=FULL\nFRAME\n`)

	const size = width * height
	let pix = Buffer.alloc(size * 3)
	for (let j = 0; j < height; j++) {
		for (let i = 0; i < width; i++) {
			const src = (i + width * j) * 4
			const dest = i + width * j

			const a = rgba[src + 3] / 255
			const a1 = 1 - a
			let r = Math.round(a * rgba[src + 0] + a1 * BG_COLOR.r)
			let g = Math.round(a * rgba[src + 1] + a1 * BG_COLOR.g)
			let b = Math.round(a * rgba[src + 2] + a1 * BG_COLOR.b)

			// // for RGB mode add '--cicp', '1/13/0' to args
			// // https://github.com/AOMediaCodec/libavif/issues/792
			// pix[dest + size * 0] = g
			// pix[dest + size * 1] = b
			// pix[dest + size * 2] = r

			// // RGB -> YCbCr
			// pix[dest + size * 0] = 0 + 0.299 * r + 0.587 * g + 0.114 * b
			// pix[dest + size * 1] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
			// pix[dest + size * 2] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b

			// RGB -> YCbCr
			// result is *almost* identical to avifenc's `avifImageRGBToYUV`
			// https://github.com/AOMediaCodec/libavif/blob/772b49e2c313181eb7cf15780ce30782b803996f/src/reformat.c#L180
			r /= 255
			g /= 255
			b /= 255
			// https://github.com/AOMediaCodec/libavif/blob/0c11cb19478149b1cc0853288944b1351b9174e6/src/colr.c#L157
			const kr = 0.299
			const kb = 0.114
			const kg = 1 - kr - kb
			const Y = kr * r + kg * g + kb * b
			pix[dest + size * 0] = roundClamp255(Y * 255)
			pix[dest + size * 1] = roundClamp255(128 + ((b - Y) / (2 * (1 - kb))) * 255)
			pix[dest + size * 2] = roundClamp255(128 + ((r - Y) / (2 * (1 - kr))) * 255)
		}
	}

	if (chromaSubsampling) {
		const w2 = width / 2
		const h2 = height / 2
		for (const [srcOffset, destOffset] of [
			[width * height, width * height],
			[width * height * 2, width * height + w2 * h2],
		])
			for (let j = 0; j < h2; j++) {
				for (let i = 0; i < w2; i++) {
					let sum = 0
					for (let si = 0; si < 2; si++)
						for (let sj = 0; sj < 2; sj++)
							sum += pix[srcOffset + (i * 2 + si) + width * (j * 2 + sj)]
					pix[destOffset + i + w2 * j] = sum / 4
				}
			}
		pix = pix.subarray(0, width * height + 2 * w2 * h2)
	}

	return new Promise((res, rej) => {
		ws.write(pix, err => (err ? rej(err) : res()))
	})
}
function roundClamp255(x) {
	x = Math.floor(x + 0.5)
	return x < 0 ? 0 : x > 255 ? 255 : x
}

/**
 * {@link http://www.ece.ualberta.ca/~elliott/ee552/studentAppNotes/2003_w/misc/bmp_file_format/bmp_file_format.htm}
 * @param {import('stream').Writable} ws
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgba
 * @returns {Promise<void>}
 */
function writeBmp24(ws, width, height, rgba) {
	const lineWidth = Math.ceil(width / 4) * 4

	// Header
	ws.write('BM') //Signature
	ws.write(
		Buffer.from(
			[
				i32(14 + 40 + lineWidth * height * 3), //FileSize
				i32(0), //reserved
				i32(14 + 40), //DataOffset
			].flat(),
		),
	)
	// InfoHeader
	ws.write(
		Buffer.from(
			[
				i32(40), //Size
				i32(width), //Width
				i32(height), //Height
				i16(1), //Planes
				i16(24), //Bits Per Pixel
				i32(0), //Compression
				i32(0), //ImageSize
				i32(1), //XpixelsPerM
				i32(1), //YpixelsPerM
				i32(0), //Colors Used
				i32(0), //Important Colors
			].flat(),
		),
	)

	const pix = Buffer.alloc(lineWidth * height * 3)
	for (let j = 0; j < height; j++) {
		for (let i = 0; i < width; i++) {
			const src = (i + width * j) * 4
			const dest = (i + lineWidth * (height - j - 1)) * 3
			const a = rgba[src + 3] / 255
			const a1 = 1 - a
			pix[dest + 2] = Math.round(a * rgba[src + 0] + a1 * BG_COLOR.r)
			pix[dest + 1] = Math.round(a * rgba[src + 1] + a1 * BG_COLOR.g)
			pix[dest + 0] = Math.round(a * rgba[src + 2] + a1 * BG_COLOR.b)
		}
	}

	// await new Promise((res, rej) => ws.on('finish', res).on('error', rej))
	return new Promise((res, rej) => {
		ws.write(pix, err => (err ? rej(err) : res()))
	})
}
function i32(n) {
	return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]
}
function i16(n) {
	return [n & 0xff, (n >> 8) & 0xff]
}
