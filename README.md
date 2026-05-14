# 3D Volcano Digital Twin

Next.js 16 / React 19 app for visualising volcanic terrain, ortho imagery, 3D tilesets, Gaussian splats, and (new) **interactive lahar/lava flow simulation** on a Cesium globe.

## Requirements

- **Node.js** 20+
- **pnpm** 10.33 (the version in `packageManager`)
- Optional: a **Cesium Ion** access token if you want the Cesium World Imagery basemap

## Install

```bash
# clone the repo, then:
pnpm install

# (the postinstall hook copies cesium/Build/Cesium/** into public/cesium —
# this is required at runtime; if you ever see "failed to load worker"
# errors from Cesium, run this manually:)
pnpm copy-cesium
```

Create a `.env.local` (optional):

```env
NEXT_PUBLIC_CESIUM_ION_TOKEN=your_ion_token_here
```

## Run

```bash
pnpm dev      # start dev server with Turbopack on http://localhost:3000
pnpm build    # production build (runs `next build`)
pnpm start    # serve the production build
pnpm lint     # ESLint (Next.js core-web-vitals + simple-import-sort)
pnpm test     # vitest unit tests for lib/lahar/
```

There is no test setup outside `lib/lahar/` — the test suite covers the simulation engine, material profiles, LAHARZ formula, LSP validator, SWE/D8 solvers. UI/Cesium changes need manual browser verification.

## Routes

- **`/`** — primary single- or dual-Cesium viewer with sidebars (this is where the lahar/lava simulation lives).
- **`/half-3d`** — alternate viewer that builds terrain meshes directly from GeoTIFF DTMs using Three.js (`components/half-3d/TerrainViewer.tsx`).

---

## Using the Lahar / Lava Flow simulation

The simulation feature is wired up to **Mt. Kelud (2014)** out of the box, using a synthetic Gaussian-cone heightmap. Other volcanoes/years light up automatically when their `yearData[year].laharData` field is populated in `lib/volcano/types.ts`.

### Quick start

1. `pnpm dev` and open <http://localhost:3000>.
2. In the **left sidebar**, select **Gunung Kelud**.
3. The year `2014` is selected by default. The **Lahar/Lava Simulation** section appears in the sidebar (it only shows for years that have a `laharData` bundle).
4. Pick a **Mode**: `Off` / `Lahar` / `Lava`. Choosing Lahar or Lava activates click-to-place on the globe.
5. Pick a **Material** profile:
   - **Lahar (wet, hyperconcentrated)** — fastest, widest spread (most water-like)
   - **Lahar (dry, debris-rich)** — narrower, deposits earlier
   - **Lava (basaltic)** — narrow channelised lava (Hawai'i-style)
   - **Lava (andesitic)** — viscous, slow, very narrow (Merapi-style)
6. Edit the **Volume** triple (`min` / `likely` / `max`, in m³). When you click on a precomputed LSP candidate the volumes auto-fill.
7. **Click on a stream** on the globe (yellow stream lines are visible after data loads). The click is validated against the four PEARPY conditions:
   - must snap to a mainstem within 80 m → otherwise "outside any lahar stream"
   - must lie inside the proximal hazard cone → otherwise "outside the proximal hazard zone"
   - must lie inside the deposition polygon → otherwise "outside the deposition area"
   - must snap to a precomputed LSP junction within 150 m → otherwise "not near any precomputed lahar starting point"

   A successful click places a colored marker at the snapped LSP, and the three LAHARZ confidence ellipses (red high-probability inside, orange medium, yellow low) appear around it.
8. Press **Play** in the sidebar. The simulation runs in a Web Worker:
   - **Lahar mode** — depth heatmap grows downhill following Saint-Venant 2D with Bingham yield-stress. Lahar stops on low slopes, the way real debris flows do.
   - **Lava mode** — particles advect downhill via D8 with stochastic lateral spread, fading with age.
9. Watch live stats: max depth (m), wetted cells, sim time (s). **Pause** / **Reset** any time.
10. Switch material on the fly — the worker reinitialises automatically.

Rejection messages appear in the browser console (not yet surfaced as toasts in the UI — see follow-ups in [`lib/lahar/README.md`](lib/lahar/README.md)).

### Mutual exclusion

Activating simulation mode disables comparison mode and Gaussian Splat (and vice versa). Toggling comparison off again does **not** auto-enable simulation; switch the mode explicitly in the sidebar.

### Mountain coverage

The `laharData` bundle currently exists for **Mt. Kelud 2014** only. To add another mountain/year, populate its `laharData` field in [`lib/volcano/types.ts`](lib/volcano/types.ts) pointing at a bucket path with these files:

```
{baseUrl}/heightmap.png         16-bit PNG (R = high byte, G = low byte)
{baseUrl}/heightmap.json        sidecar: width, height, bbox, elevationMin, elevationMax, cellSizeM
{baseUrl}/mainstem.geojson      FeatureCollection<LineString>  (streamId per feature)
{baseUrl}/branches.geojson      FeatureCollection<LineString>  (optional)
{baseUrl}/deposition.geojson    FeatureCollection<Polygon>
{baseUrl}/hazardCone.geojson    FeatureCollection<Polygon>
{baseUrl}/lspCandidates.geojson FeatureCollection<Point>       (lspId, streamId, elevation, slvMin, slvLikely, slvMax)
```

The bundle is published by the offline [PEARPY](https://github.com/ruliandaru/pearpy) toolchain (Andaru et al. 2022). Until production outputs are available, see the synthetic generator below.

### Generating test data (synthetic Kelud)

Two Node scripts under `scripts/lahar/` produce the test dataset committed under `public/lahar-test-data/gunung-kelud/2014/`:

```bash
# 1. heightmap.png + heightmap.json
#    Hits OpenTopography SRTMGL1 for the Kelud summit ±3 km;
#    falls back to a synthetic Gaussian cone if the API is unavailable.
#    Set OPENTOPO_KEY=... env var to use your own API key.
pnpm tsx scripts/lahar/bake-srtm.ts

# 2. mainstem / branches / deposition / hazardCone / lspCandidates GeoJSON
#    Runs pure-JS D8 + flow accumulation over the baked heightmap.
pnpm tsx scripts/lahar/bake-streams.ts
```

The deposition polygon and hazard cone are currently synthetic circles. Replace `LaharDataRef.baseUrl` with a bucket URL once the offline PEARPY pipeline publishes real outputs — no code change required.

---

## Architecture (overview)

- `lib/volcano/context.tsx` — global state for selected mountain, year, layer visibility, comparison mode, **simulation mode + engine** (single shared Web Worker for all consumers).
- `lib/lahar/` — simulation library (see [`lib/lahar/README.md`](lib/lahar/README.md) for the deep dive: SWE + Bingham yield, D8 + particles, LAHARZ envelope, LSP validator).
- `components/cesium/Viewer.tsx` — Cesium scene; mounts `SimSourcePicker`, `SimDepthRenderer`, `SimParticleRenderer`, `LaharzEnvelope` when simulation mode is active.
- `components/left-sidebar/lahar-sim/` — sidebar UI (mode toggle, material select, volume triple, play/pause/reset, runtime stats).
- `app/api/{weather,air-quality,fire}/` — server routes proxying open data for the right sidebar.

## Convention notes

- Imports must be sorted (`simple-import-sort/imports` is an ESLint error). Run `pnpm lint` after touching imports.
- Path alias `@/*` → repo root.
- Cesium and Resium are in `transpilePackages` in `next.config.ts` — keep them there.
- Tailwind v4 via `@tailwindcss/postcss`; design tokens are inline in `app/globals.css`.

## License

Internal research/prototype. Cite the underlying papers when reusing simulation logic — see [`lib/lahar/README.md`](lib/lahar/README.md) for the full reference list.
