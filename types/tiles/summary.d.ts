/** @param {Uint8Array} mask */
export function encodeLayerMask(mask: Uint8Array): string;
/**
 * @param {string} maskStr
 * @param {number} size
 */
export function decodeLayerMask(maskStr: string, size: number): Uint8Array;
/**
 * @param {TileLayerSummary[]} layersInfo
 * @returns {(x:number, y:number, z:number) => boolean}
 */
export function makeTileMaskChecker(layersInfo: TileLayerSummary[]): (x: number, y: number, z: number) => boolean;
export type TileLayerSummary = [
    level: number,
    rect: [left: number, top: number, right: number, bottom: number],
    maskStr: string
];
