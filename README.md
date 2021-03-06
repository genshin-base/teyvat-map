## Branches

### master

Just scripts, no images.

### images

Scripts from `master` + images (tiles, sources).

### gh-pages

In separate version folders: images (only jpeg+avif tiles), demo pages.

## Prepare

`rm -r ./tmp/preview_tiles`.

`./scripts/generate_map_chunks_preview.js --map teyvat`

Open `./tmp/preview_tiles/teyvat/index.html`, select rect and tiles.

Modify `IN_TILES_CONFIG` in `global_config.js`

`./scripts/generate_raw_tiles.js --map teyvat`

### Prepare map mask

Set `OUT_MAP_MASK_CFG.teyvat.enable` to `false` in `global_confg.js`.

Set `CROP.teyvat` rect values to zero (disable crop) in `./scripts/concat_raw_tiles.js`.

`./scripts/concat_raw_tiles.js --map teyvat`

Use output map to update `mask_teyvat.svg` (it shoud include correct `stroke-with` and `stroke` color).

Set `OUT_MAP_MASK_CFG.teyvat.enable` back to `true`.

Restore `CROP.teyvat` values.

## Generate map

### Single file

`./scripts/concat_raw_tiles.js --map teyvat`

### Tiles

`./scripts/generate_png_tile_layers.js --map teyvat`

`./scripts/convert_png_tile_layers.js --map teyvat`

`./scripts/generate_tile_layers_summary.js`
