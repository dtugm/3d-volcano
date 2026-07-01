export const G = 9.81;             // m/s² gravity
export const CFL = 0.5;            // Courant safety factor for SWE
export const H_MIN = 1e-4;         // minimum depth (m) for momentum
export const MAX_DT = 2.0;         // s
export const WATER_DEPTH_SCALE = 1.0;
export const MAX_DEPTH = 20.0;     // m, clamp
// Bumped D8 numbers for more dramatic lava visuals on coarse grids.
export const DEPTH_INCREMENT = 0.04;
export const PARTICLES_PER_TICK = 20;
export const MAX_PARTICLE_AGE = 600;
export const MAX_PARTICLES = 8000;
export const SLOPE_SENSITIVITY = 5.0;
export const SPREAD_PROB = 0.35;
// Snapshot less often so the main thread isn't constantly rebuilding the
// imagery layer. The worker still advances physics at full speed.
export const SNAPSHOT_INTERVAL = 8;
// Minimum wall-clock interval between snapshots posted from the worker.
// Even if the step counter says snapshot, skip it if we already posted one
// within this many ms — caps the per-second main-thread cost.
export const SNAPSHOT_MIN_MS = 150;
