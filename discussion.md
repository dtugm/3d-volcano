## 4. Discussion

### 4.1 Interactive Lahar and Lava Flow Simulation Module

The principal enhancement introduced in this work is an interactive flow simulation module
integrated directly into the existing 3D Volcano Digital Twin platform. Unlike prior
implementations that treat hazard zonation as a static offline product
[HINT: cite Andaru et al. 2022; Schilling 2014], the module exposes a real-time,
physics-informed simulation that responds to user-defined source locations and material
parameters within the same 3D globe interface. This design choice reflects the growing
need for interactive geoscience tools that allow practitioners to test hypothetical eruption
scenarios without requiring specialised software installation [HINT: cite Deng et al. 2019
or Mergili et al. 2020 for digital twin motivation].

---

### 4.2 Dual-Solver Architecture: SWE for Lahar, D8 for Lava

A key design decision is the routing of material type to one of two physically distinct
solvers via a single `kind` flag on the material profile:

- **Lahar (low viscosity)** is routed to a **2D Shallow-Water Equations (SWE) solver**
  (Saint-Venant formulation, explicit first-order upwind), which propagates a depth field
  *h* and momentum fluxes (*q*_x, *q*_y) on the terrain grid. The time-step is computed
  adaptively via the Courant–Friedrichs–Lewy (CFL) condition:

  Δ*t* ≤ CFL · Δ*x* / √(*g* · *h*_max)

  preventing numerical instability during rapid frontal advance.

- **Lava (high viscosity)** is routed to a **stochastic D8 particle advection solver**.
  Each particle follows the steepest-descent direction (among eight cardinal and diagonal
  neighbours, weighted by diagonal distance), with a lateral spread probability that
  scales inversely with viscosity. This probabilistic formulation is inspired by the
  MrLavaLoba framework of de' Michieli Vitturi & Tarquini (2018) and the OpenLISEM
  approach, and produces the lobate, braided morphology characteristic of slow lava flows
  without the prohibitive computational cost of full Navier–Stokes rheology.

The separation of solver paths by material kind avoids the well-known difficulty of
applying a single model across the full viscosity range of volcanic mass flows
[HINT: cite Pudasaini & Mergili 2019 for multi-phase justification], while keeping the
front-end architecture uniform: both solvers write into a shared `DepthGrid`, and the
same `SimSnapshot` structure is emitted to the renderer regardless of solver.

---

### 4.3 Bingham Yield-Stress Term as the Physical Departure from the Base Model

The SWE solver introduces a **Bingham yield-stress check** as its primary departure from
the purely advective base model. For each grid cell, bed shear stress is estimated as:

τ = ρ · *g* · *h* · |∇(*z* + *h*)|

where *ρ* is bulk density, *g* is gravitational acceleration, *h* is flow depth, and
|∇(*z* + *h*)| is the local free-surface gradient magnitude. When τ falls below the
material's yield strength τ_y, the momentum fluxes for that cell are set to zero,
effectively halting local flow. This term, grounded in the depth-averaged
debris-flow model of Iverson & George (2014), produces the physically realistic
behaviour of lahars stopping on low-gradient surfaces (e.g., broad valley floors or
depositional fans) — a behaviour absent in pure water models and critical for correct
downstream inundation mapping [HINT: cite Iverson & George 2014; also Iverson 1997 for
debris-flow rheology baseline].

Four material profiles — wet hyperconcentrated lahar, dry debris-rich lahar, basaltic
lava, and andesitic lava — are parameterised with distinct density, Manning roughness,
yield strength, and LAHARZ scaling coefficients, following Iverson, Schilling & Vallance
(1998) and informed by the material-dependent calibration approach of Bernard et al.
(2021) for coarser-grained debris flows. The profiles are user-selectable in the sidebar,
enabling scenario comparison within a single session.

---

### 4.4 LAHARZ Empirical Envelope with Material-Dependent Coefficients

To provide a deterministic upper-bound reference alongside the physics simulation, the
module computes a **three-level LAHARZ inundation envelope** (Iverson, Schilling &
Vallance 1998; Schilling 2014) from the user-supplied volume triple (V_min, V_likely, V_max):

*A* = *a* · *V*^(2/3)    (cross-sectional inundation area, m²)
*B* = *b* · *V*^(2/3)    (planimetric inundation area, m²)

The **main novelty contribution** of this module relative to the standard LAHARZ
implementation is that the scaling coefficients *a* and *b* are stored **per material
profile** rather than as universal constants. For example, the wet-lahar profile carries
(*a*, *b*) = (0.05, 200), matching the original volcanic-lahar calibration, while the
andesitic-lava profile uses (0.20, 30), reflecting the narrower, shorter-runout morphology
characteristic of high-viscosity effusive flows. This design, analogous to the
material-dependent calibration of Bernard et al. (2021), produces hazard envelopes that
shift in shape and extent as the user switches material profiles — providing immediate
visual feedback on how material properties influence the inundation footprint.

The three volume levels map onto probability bands analogous to Schilling (2014)'s
LDZCL confidence levels: V_min → **high probability** (smallest footprint), V_likely →
**medium probability**, and V_max → **low probability** (largest footprint). All three
bands are rendered simultaneously as concentric overlapping polygons in the Cesium viewer,
overlaid on the physics simulation for direct comparison.

[HINT: Figure X — screenshot showing all three LAHARZ confidence rings alongside the SWE
depth field for a laharWet scenario at Kelud 2014]

---

### 4.5 Lahar Starting Point (LSP) Validation via Four PEARPY Conditions

User-defined source locations are not accepted unconditionally. The module implements a
**four-condition click validator** derived from the PEARPY methodology of Andaru et al.
(2022), which enforces the following checks in sequence:

1. **Stream proximity** — the click must snap to a mainstem polyline segment within
   a tolerance of 80 m; clicks on non-channel terrain are rejected (`outside_stream`).
2. **Proximal hazard cone** — the snapped point must lie within the energy-cone boundary
   (H/L criterion from PEARPY), representing the zone where primary lahar initiation is
   physically plausible (`below_hazard_cone`).
3. **Deposition polygon** — the point must fall within the post-eruption DEM-of-Difference
   positive region, corresponding to the PEARPY-derived area of material available for
   remobilisation (`not_in_deposition`).
4. **Pre-computed LSP candidate proximity** — the snapped point is associated with the
   nearest pre-computed LSP candidate on the same stream, if one exists within 150 m.
   Each candidate carries the PEARPY-extracted SLV triple for that location, which is
   automatically loaded into the volume inputs on selection.

This validation chain prevents the simulation from being started at geophysically
implausible locations while remaining permissive enough for exploratory use: if no
curated LSP candidate is within range, conditions 1–3 still gate access and the user's
snapped stream coordinate is accepted directly. The progressive rejection feedback
(displayed as inline sidebar messages) guides non-expert users toward valid source
selections without exposing the full PEARPY vocabulary.

[HINT: Figure X — diagram illustrating the four validation conditions on the Kelud
mainstem network, with annotated acceptance and rejection zones]

---

### 4.6 Web Worker Architecture for Non-Blocking Simulation

All numerically intensive computation — grid initialisation, time-stepping, and snapshot
serialisation — runs inside a **dedicated Web Worker**, decoupled from the browser's main
UI thread. The worker accepts a message-passing API (`init`, `setSource`, `setProfile`,
`setBudget`, `step`, `reset`) and returns `SimSnapshot` objects via the Transferable
interface (zero-copy `ArrayBuffer` transfer for the depth and particle arrays), minimising
inter-thread latency.

The main thread drives the simulation via a `requestAnimationFrame` loop in the
`useSimEngine` React hook: each frame triggers a `step` message to the worker, and the
returned snapshot is stored in React state for rendering. Snapshots are throttled by both
a step interval (`SNAPSHOT_INTERVAL = 5`) and a minimum wall-clock gap
(`SNAPSHOT_MIN_MS`), ensuring that the viewer does not redraw faster than the display
refresh rate even on slow hardware. This architecture allows the simulation to run at
interactive frame rates (>24 fps in testing on an M-series MacBook at 256 × 256 grid
resolution) while the rest of the digital twin — terrain rendering, basemap loading, and
sidebar inputs — remains fully responsive.

---

### 4.7 Integration with the 3D Digital Twin Viewer

The simulation output is rendered through three dedicated Cesium overlay components, each
consuming the same `SimSnapshot` state emitted by the worker hook:

- **`SimDepthRenderer`** (lahar mode) — encodes the depth grid as a colour-mapped
  `SingleTileImageryProvider`, reprojected from grid coordinates to geographic bounds
  using the heightmap's bounding box. Opacity scales linearly with normalised depth to
  avoid occluding the underlying terrain for shallow wet areas.
- **`SimParticleRenderer`** (lava mode) — renders each live D8 particle as a
  `PointPrimitive` in a `PointPrimitiveCollection`, with colour interpolated from the
  particle's age (yellow-to-red) to convey advance front position and elapsed flow time.
- **`LaharzEnvelope`** — draws the three-level LAHARZ circles as `Entity` polygons
  with distinct transparency levels (high → 0.55, medium → 0.35, low → 0.20), providing
  a static probabilistic reference frame that persists through the animation.

All three components are mounted inside the existing `CesiumViewer` wrapper and removed
on simulation reset, preserving the viewer's memory budget and avoiding primitive leaks.
The simulation section in the left sidebar houses the mode selector, material dropdown,
volume triple inputs, and playback controls, consistent with the sidebar UX conventions
established for terrain/ortho/3D-tile layer management.

---

### 4.8 Limitations and Future Work

Several limitations of the current prototype warrant acknowledgement:

- The Kelud 2014 test dataset uses a **synthetic Gaussian-cone DEM** in lieu of the
  real SRTM 1-arc-second tile (OpenTopography API rate limit). Flow paths on the
  synthetic terrain diverge from observed historical lahar channels; the module is
  validated structurally but not yet quantitatively against historical deposit maps.
  [HINT: note that real SRTM can be enabled via `OPENTOPO_KEY` env var]
- LAHARZ envelopes are rendered as **area-equivalent circles** rather than channel-
  following polygons. Correct downstream routing requires PEARPY's `LDZCL` raster
  output to be available from the data bucket.
- The SWE solver is **first-order accurate** in both space and time. Higher-order
  reconstruction (MUSCL-Hancock or Roe-type solvers) would improve front speed accuracy
  at low Courant numbers, at the cost of implementation complexity.
- Only a **single active simulation** is supported at once (shared `VolcanoContext`
  engine instance). Multi-source or comparative multi-scenario simulation would require
  independent engine instances and additional viewer overlay management.

Future work will couple the simulation with the photogrammetric point-cloud record
already managed by the digital twin (particularly Gaussian Splat layers for post-eruption
morphology), enabling the depth field to be calibrated against observed deposit thickness
extracted from multi-epoch UAV surveys — consistent with the PEARPY pipeline described
in Andaru et al. (2022) and the UAV-derived DEM approach of Andaru et al. (2021).