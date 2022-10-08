import { BASE_DIR } from './scripts/_common.js'

/**
 * @type {import('#lib/tiles/raw').ForEachMap<import('#lib/tiles/raw').TilesConfig>}
 */
export const IN_TILES_CONFIG = {
	teyvat: {
		// source game tile dirs (with files named like "UI_MapBack_1_2.png")
		dirs: [],
		// (optional) useful for cutting off excess (blank and useless) source tiles.
		// ascending from right to left, from bottom to top.
		rect: {
			left: 6,
			right: -6,
			top: 3,
			bottom: -7,
		},
		// (optional) choosing correct image for tiles (if multiple images for same tile are available)
		choices: [
			'............',
			'............',
			'............',
			'...111......',
			'..01121.....',
			'..01111.....',
			'...11.......',
			'...0........',
			'......1.....',
			'............',
		],
	},
	enkanomiya: {
		// dirs with files named like "UI_MapBack_AbyssalPalace_1_-2.png" and "UI_Map_AbyssalPalace_HideParcels_01.png"
		dirs: [],
		rect: {
			left: 1,
			right: -2,
			top: 1,
			bottom: -2,
		},
		choices: [
			'....', //
			'....',
			'....',
			'....',
		],
		// manual tile positions, overlay to grid tiles (coord are relative to MAP_ORIGINS)
		manual: [
			{ name: /^UI_Map_AbyssalPalace_HideParcels_01/, x: -1111 / 1024, y: -1618 / 1024, choice: 0 },
			{ name: /^UI_Map_AbyssalPalace_HideParcels_02/, x: 333 / 1024, y: -1458 / 1024, choice: 0 },
			{ name: /^UI_Map_AbyssalPalace_HideParcels_03/, x: -191 / 1024, y: 496 / 1024, choice: 0 },
		],
	},
	chasm: {
		dirs: [],
		rect: {
			left: 1,
			right: -1,
			top: 1,
			bottom: -1,
		},
		choices: [
			'..', //
			'..',
		],
	},
}

/** @type {import('#lib/tiles/raw').ForEachMap<import('#lib/tiles/raw').MapOrigin>} */
export const MAP_ORIGINS = {
	teyvat: {
		tile: { i: -1, j: 2 },
		offset: { x: 1498.5 / 2048, y: 1498.5 / 2048 },
	},
	enkanomiya: {
		tile: { i: 0, j: 0 },
		offset: { x: 811 / 1024, y: 754 / 1024 },
	},
	chasm: {
		tile: { i: 0, j: 0 },
		// the middle of the purple circle
		offset: { x: 502 / 1024, y: 570 / 1024 },
	},
}

/**
 * @type {import('#lib/tiles/raw').ForEachMap<import('#lib/tiles/mask').MaskConfig>}
 */
export const OUT_MAP_MASK_CFG = {
	teyvat: {
		enable: true,
		fpath: `${BASE_DIR}/mask_teyvat.svg`,
		// shadows[].blur is set for 1024-sized source tile, it will be scaled if different size is used.
		shadows: [
			{ side: 'outer', from: 'fill', blur: 64, color: 'dodgerblue' },
			{ side: 'outer', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.125)' },
			{ side: 'inner', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.25)' },
		],
	},
	enkanomiya: {
		enable: true,
		fpath: `${BASE_DIR}/mask_enkanomiya.svg`,
		shadows: [
			{ side: 'outer', from: 'fill', blur: 64, color: 'dodgerblue' },
			{ side: 'outer', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.125)' },
			{ side: 'inner', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.25)' },
		],
	},
	chasm: {
		enable: true,
		fpath: `${BASE_DIR}/mask_chasm.svg`,
		shadows: [
			{ side: 'outer', from: 'fill', blur: 64, color: 'dodgerblue' },
			{ side: 'outer', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.125)' },
			{ side: 'inner', from: 'stroke', blur: 5, color: 'rgba(0, 0, 0, 0.25)' },
		],
	},
}
