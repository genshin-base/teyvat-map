import path from 'path'
import { promises as fs } from 'fs'

/** @returns {Record<string, string>} */
export function parseArgs() {
	return process.argv
		.slice(2)
		.flatMap(x => x.split(/(?<=^--?[\w-]+)=/))
		.reduce(
			({ args, key }, cur) =>
				cur.startsWith('-')
					? ((args[cur] = 'true'), { args, key: cur })
					: ((args[key] = cur), { args, key: 'cmd' }),
			{ args: /**@type {Record<string, string>}*/ ({}), key: 'cmd' },
		).args
}

/** @param {string} fpath */
export function relativeToCwd(fpath) {
	return path.relative(process.cwd(), fpath)
}

/** @param {string} fpath */
export function exists(fpath) {
	return fs
		.stat(fpath)
		.then(() => true)
		.catch(err => {
			if (err.code === 'ENOENT') return false
			throw err
		})
}

/** @param {string} path */
export async function recreateDir(path) {
	await fs.rm(path, { recursive: true, force: true })
	await fs.mkdir(path, { recursive: true })
}

/**
 * @param {import('stream').Readable} rs
 * @returns {Promise<Buffer>}
 */
export function readAllStream(rs) {
	return new Promise((res, rej) => {
		const chunks = []
		rs.on('data', chunk => chunks.push(chunk))
		rs.on('end', () => res(Buffer.concat(chunks)))
		rs.on('error', rej)
	})
}
