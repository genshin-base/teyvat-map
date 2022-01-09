import { normalize } from 'path'
import { dirname } from 'path/posix'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
export const BASE_DIR = normalize(`${dirname(__filename)}/..`)

export const OUT_RAW_TILES_DIR = `${BASE_DIR}/raw_tiles`
export const OUT_TILES_DIR = `${BASE_DIR}/tiles`
