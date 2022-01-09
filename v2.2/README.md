## Prepare

`./scripts/preview_map_chunks.js`

Open `./tmp/preview_tiles/index.html`, select rect and tiles.

Modify `IN_TILES_CONFIG` in `global_config.js`

`./scripts/generate_raw_tiles.js`

### Prepare map mask

Set `OUT_MAP_MASK_CFG.enable` to `false` in `global_confg.js`.

`./scripts/concat_raw_tiles.js`

Use output map to update `mask.svg` (it shoud include correct `stroke-with` and `stroke` color).

Set `OUT_MAP_MASK_CFG.enable` to `true`.

## Generate map

### Single file

`./scripts/concat_raw_tiles.js`

### Tiles

`./scripts/generate_png_tile_layers.js`

`./scripts/convert_png_tile_layers.js`

`./scripts/generate_tile_layers_summary.js`