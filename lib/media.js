import { spawn } from 'child_process'
import { createWriteStream, promises as fs } from 'fs'
import canvas from 'canvas'
const { loadImage } = canvas

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} [options]
 */
export function runCmd(cmd, args, options = { stdio: 'inherit' }) {
	const process = spawn(cmd, args, options)
	/** @type {Promise<void>} */
	const promise = new Promise((resolve, reject) => {
		process.on('close', code =>
			code === 0 ? resolve() : reject(new Error(`'${cmd} ${args.join(' ')}' exited with code ${code}`)),
		)
	})
	return { process, promise }
}

/**
 * {@link https://imagemagick.org/script/command-line-options.php}
 * @param {string} inFPath
 * @param {string} outFPath
 * @param {string[]} args
 * @param {string} [format]
 */
export function magick(inFPath, outFPath, args, format) {
	return runCmd('magick', [inFPath, ...args, (format ? format + ':' : '') + outFPath]).promise
}

/**
 * @param {string} inFPath
 * @param {string} outFPath
 * @param {string} size
 *  * `width`           Width given, height automagically selected to preserve aspect ratio.
 *  * `xheight`         Height given, width automagically selected to preserve aspect ratio.
 *  * `widthxheight`    Maximum values of height and width given, aspect ratio preserved.
 *  * `widthxheight^`   Minimum values of width and height given, aspect ratio preserved.
 *  * `widthxheight!`   Width and height emphatically given, original aspect ratio ignored.
 *  * `widthxheight>`   Shrinks an image with dimension(s) larger than the corresponding width and/or height argument(s).
 *  * `widthxheight<`   Enlarges an image with dimension(s) smaller than the corresponding width and/or height argument(s).
 *
 * More: {@link https://imagemagick.org/script/command-line-processing.php}
 */
export function resize(inFPath, outFPath, size) {
	return magick(inFPath, outFPath, ['-resize', size])
}

/**
 * @param {string} inFPath
 * @param {string} outFPath
 * @param {number} [level]
 */
export async function optipng(inFPath, outFPath, level = 3) {
	// если outFPath существует, optipng создаёт рядом .bak-файл независимо от флагов, рукалицо
	await fs.rm(outFPath, { force: true })
	return runCmd('optipng', ['-strip=all', '-nx', '-quiet', '-o' + level, inFPath, '-out', outFPath]).promise
}

/** @param {string} fpath */
export function loadImageIfExists(fpath) {
	return loadImage(fpath).catch(err => {
		if (err.code === 'ENOENT') return null
		throw err
	})
}

/**
 * @param {string} fpath
 * @param {canvas.Canvas} canvas
 */
export function saveCanvas(fpath, canvas) {
	return new Promise((res, rej) => {
		const outStream = createWriteStream(fpath)
		canvas.createPNGStream().pipe(outStream)
		outStream.on('finish', res).on('error', rej)
	})
}

/**
 * @param {string} fpath
 * @param {number} level
 * @param {{orig:number, opt:number}} [stats]
 */
export async function optimizeInPlace(fpath, level, stats) {
	const optFPath = fpath + '.opt'
	await optipng(fpath, optFPath, level)
	if (stats) {
		stats.orig += (await fs.stat(fpath)).size
		stats.opt += (await fs.stat(optFPath)).size
	}
	await fs.rename(optFPath, fpath)
}
