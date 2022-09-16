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

Set `TILE_SIZE = 128`.

`./scripts/concat_raw_tiles.js --map teyvat`

Use output map to update `mask_teyvat.svg` (it should include correct `stroke-with` and `stroke` color).

Set `OUT_MAP_MASK_CFG.teyvat.enable` back to `true`.

Restore `CROP.teyvat` values.

Restore `TILE_SIZE` value.


## Generate map

### Single file

`./scripts/concat_raw_tiles.js --map teyvat`

### Tiles

`./scripts/generate_png_tile_layers.js --map teyvat`

`./scripts/convert_png_tile_layers.js --map teyvat`

`./scripts/generate_tile_layers_summary.js`


## Update gh-pages

```bash
version=v3.0
git checkout images
mkdir $version
cp -r --reflink=auto tiles $version/tiles
npm run build-demo
mv demo $version/demo
git checkout images
git add $version
git commit
```

Update URL on [map repo page](https://github.com/genshin-base/teyvat-map).
