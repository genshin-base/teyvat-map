import { BASE_DIR } from './scripts/_common.js'

/**
 * @type {import('#lib/tiles/raw').TilesConfig}
 */
export const IN_TILES_CONFIG = {
	// source game tile dirs (with files named like "UI_MapBack_1_2.png")
	dirs: [],
	// (optional) useful for cutting off excess (blank and useless) source tiles.
	// ascending from right to left, from bottom to top.
	rect: {
		left: 2,
		right: -6,
		top: 3,
		bottom: -7,
	},
	// (optional) choosing correct image for tiles (if multiple images for same tile are available)
	choices: [
		'..0..01.1',
		'.....0...',
		'.0.00...0',
		'....001.0',
		'....00110',
		'..1100001',
		'......1..',
		'.11..0.11',
		'.11111111',
		'....122..',
		'.....11..',
	],
}

/**
 * @type {import('#lib/tiles/mask').MaskConfig}
 */
export const OUT_MAP_MASK_CFG = {
	enable: true,
	fpath: `${BASE_DIR}/mask.svg`,
	// shadows[].blur is set for 1024-sized source tile, it will be scaled if different size is used.
	shadows: [
		{ side: 'outer', from: 'fill', blur: 64, color: 'dodgerblue' },
		{ side: 'outer', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.125)' },
		{ side: 'inner', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.25)' },
	],
}
