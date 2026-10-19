# Volcano Digital Twin (Geo-AIT UGM)

Next.js 16 app for monitoring active volcanoes from repeated drone surveys.

| Route | Module |
| --- | --- |
| `/` | Landing page |
| `/digital-twin` | MapLibre 3D digital twin: epoch DTM terrain, orthophoto, Gaussian Splat, LST, epoch swipe comparison, measurement, crater-volume and lahar (pearpy/LAHARZ, primary & secondary) simulations, environmental panels |
| `/slice-comparison` | Stacked crater DEMs per epoch (three.js) |

## How to run

### Requirements

- Node.js 20 or newer
- pnpm 10 (the repo pins `pnpm@10.33.0`). Enable it with `corepack enable`, or run it without installing through `npx pnpm@10.33.0 …`.

### Install & start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. `pnpm install`, `pnpm dev` and `pnpm build` copy MapLibre's worker (`maplibre-gl-{worker,shared}.mjs`) to `public/maplibre/` (git-ignored) first.

### Production build

```bash
pnpm build
pnpm start
```

### Environment variables (optional)

Create `.env.local`:

| Variable | Used by | Default |
| --- | --- | --- |
| `OPENWEATHERMAP_API_KEY` | `/api/air-quality` (air-quality panel) | none: the panel shows an error without it |
| `NEXT_PUBLIC_SENSOR_API_URL` | sensor/LST backend | `https://api-sensor-vdt-production.up.railway.app` |
| `NEXT_PUBLIC_LST_TILE_HOST` | LST tile host | `https://bucket.dt-volcano.geo-ai.id` |

Weather, earthquakes and hotspots use public APIs and need no key.

### Lint & type-check

```bash
pnpm lint
npx tsc --noEmit
```

## Project structure

```
app/                      routes (landing, (viewer)/digital-twin, (viewer)/slice-comparison, api)
components/map/           declarative MapLibre wrappers (MapView, MapSource, MapLayer, MapMarker)
components/site/          design-system UI (panels, switches, sliders, logo, icons)
features/twin/            Digital Twin page: map layers, panels, simulation cards
features/twin/splat/      splat tile fetching (ranged + Cache Storage) and decoding pool
features/twin/lava/       animated lava rendering (WebGL → MapLibre canvas source)
lib/catalog/              volcano & epoch catalogue (one file per volcano)
lib/terrain/              quantized-mesh decoding → Terrarium raster-dem tiles (Web Worker)
lib/splat/                SPZ / glTF splat decoding
lib/sim/                  LAHARZ port, hydrology, secondary starting points (Web Worker)
lib/i18n/                 Indonesian / English strings
```

## Catalogue & indexing

All datasets are declared in `lib/catalog/volcanoes/*.ts`, one file per volcano:

- each volcano has an index number (`index: 3` → **V03**) and a three-letter `code` (e.g. **MER**);
- survey epochs are numbered chronologically per volcano → **MER-E01**, **MER-E02**, …;
- crater DEM clips for Slice Comparison → **MER-S01**, …

Epoch codes are used in links: `/digital-twin?e=AGU-E05`, `/digital-twin?v=KLD`, `/slice-comparison?v=AGU`.

To add a volcano, copy `lib/catalog/volcanoes/agung.ts`, fill in its data and register it in `lib/catalog/index.ts` (`ENTRIES`). Duplicate ids/codes are rejected at start-up in development. Keep `heightOffset` (survey ellipsoidal height − global DEM orthometric height, in metres) up to date so the DTM, the global DEM and the splats line up. A landing-page `photo` (file in `public/landing/`, with its licence) is optional.

Data formats per epoch (`sources`):

- `terrain`: Cesium quantized-mesh folder (`layer.json`), decoded in a Web Worker into MapLibre `raster-dem` tiles over the global Terrarium DEM (`lib/terrain`).
- `ortho`: TMS PNG pyramid (Web Mercator, y flipped).
- `splat`: 3D Tiles 1.1 `tileset.json` with glTF `KHR_gaussian_splatting` + SPZ compression. Tiles are picked by `3d-tiles-renderer` and drawn with PlayCanvas (the SuperSplat engine) in a canvas over the map (`features/twin/GaussianSplatLayer.tsx`). Downloaded tiles are kept in the browser's Cache Storage, so later visits load in seconds.
- `splatAdjust` (optional): a correction (translate / rotate / scale in the tileset's east-north-up frame) for splats whose georeference does not match the survey DTM. The Agung 2019 and 2020 values were fitted against each epoch's DTM (residual MAD 3–4 m).

## Lahar simulation

`lib/sim/laharz*.ts` is a TypeScript port of [pearpy](https://github.com/ruliandaru/pearpy) (LAHARZ, Iverson et al. 1998; MIT). Hydrology (Priority-Flood fill, ESRI D8, flow accumulation) replaces pearpy's WhiteboxTools step and runs in a Web Worker on a DEM built from the epoch DTM + global DEM.

- **Primary**: pick a start point (removable with ×) and a volume.
- **Secondary** (pearpy `starting_point2`): deposits between two epochs (later − earlier DTM, after removing the median vertical bias and a minimum detectable change) along each main stem give the starting points and their volumes; the 12 largest are simulated. See `lib/sim/starting-points.ts`.

## Known issues & what is still missing

### Data (needs fixing at the source)

- **Epochs are not co-registered.** Orthophotos shift against 2020 by about 35 m E / 28 m N (2017) and 10–20 m E (Oct 2017); Jul 2019 is within ~5 m. Re-process all epochs on the same GCPs / reference.
- **Vertical datums differ.** The 2020 DTM is ~29 m higher than Jul 2019 everywhere (likely ellipsoidal vs orthometric heights). The app uses one `heightOffset` per volcano, so epochs sit at different heights; the secondary-lahar analysis removes the bias, but the data should share one datum.
- **Gaussian Splat georeference.** The Agung splats were placed by hand in Cesium ion (up to ~250 m too high, rotated and scaled); 2019/2020 are corrected with `splatAdjust`. Agung 2017 is too inconsistent to fit, and the Kelud 2014 tileset has no georeference at all (shown as "not georeferenced").
- **Splat loading.** The Agung tilesets are a few large files (~210 MB for 2020) without levels of detail, and the bucket sends no cache headers (some files are slow). Re-tile with LOD and add a Cloudflare cache rule for `/GaussianSplat/*`.
- `tilemapresource.xml` is missing for the 2017-12 and 2020 orthophotos (not needed by the app).
- Steep "walls" appear where a survey DTM ends against the global DEM.

### App

- Per-epoch offsets for orthophoto/DTM (a stop-gap until the data is co-registered) are not implemented.
- The splat-to-DTM fitting script used for `splatAdjust` is not in the repo yet; new epochs need it to compute their correction.
- Secondary-lahar results have not been validated against pearpy outputs (the primary LAHARZ port was checked against pearpy reference values).
- No automated tests.
- The air-quality panel needs `OPENWEATHERMAP_API_KEY`.
- Slice Comparison was only restyled and re-indexed; it still reads GeoTIFF crater clips directly.
