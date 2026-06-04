"""Preprocess a DTM into the lahar-sim data bundle expected by the app.

Outputs (under --out):
  heightmap.png         16-bit elevation encoded as R(high)+G(low), RGBA PNG
  heightmap.json        bbox, cellSizeM, width, height, elevationMin/Max
  mainstem.geojson      LineStrings from high flow-accumulation streams
  branches.geojson      LineStrings from lower flow-accumulation streams
  hazardCone.geojson    Polygon(s) above summit_elev - cone_drop
  deposition.geojson    LAHARZ runout polygon (Iverson 1998)
  lspCandidates.geojson Stream/cone junctions

Run:
  python scripts/preprocess_lahar_data.py \
      --dtm data/2020.tif \
      --out public/lahar-test-data/gunung-agung/2020 \
      --size 2560 \
      --summit-lat -8.343 --summit-lng 115.508 \
      --extent-km 12

Streams come from pysheds D8 flow accumulation. The "mainstem" threshold is
expressed as a fraction of the maximum accumulation; "branches" use a lower
fraction.  Tune --mainstem-frac / --branch-frac if the streams come out too
sparse or noisy.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

import numpy as np

# Compat shim: pysheds 0.5 still calls np.in1d which was removed in numpy 2.x.
if not hasattr(np, "in1d"):
    np.in1d = np.isin  # type: ignore[attr-defined]

import rasterio
from rasterio.enums import Resampling
from rasterio.warp import reproject
from rasterio.windows import from_bounds
from PIL import Image
from shapely.geometry import (
    LineString,
    MultiPolygon,
    Point,
    Polygon,
    mapping,
)
from shapely.ops import unary_union
from scipy.ndimage import binary_dilation, label

# pysheds is optional at import time so other tooling can still use this file.
try:
    from pysheds.grid import Grid
except Exception:  # pragma: no cover
    Grid = None


def meters_per_degree(lat_deg: float) -> tuple[float, float]:
    """Approximate metres per degree of latitude and longitude at given lat."""
    lat_rad = math.radians(lat_deg)
    m_per_deg_lat = 111132.92 - 559.82 * math.cos(2 * lat_rad) + 1.175 * math.cos(
        4 * lat_rad
    )
    m_per_deg_lng = 111412.84 * math.cos(lat_rad) - 93.5 * math.cos(3 * lat_rad)
    return m_per_deg_lat, m_per_deg_lng


def crop_and_resample(
    dtm_path: Path,
    summit_lat: float,
    summit_lng: float,
    extent_km: float,
    size: int,
) -> tuple[np.ndarray, tuple[float, float, float, float], float]:
    """Crop a square window around the summit and resample to size x size."""
    m_per_deg_lat, m_per_deg_lng = meters_per_degree(summit_lat)
    half_lat_deg = (extent_km * 1000 / 2) / m_per_deg_lat
    half_lng_deg = (extent_km * 1000 / 2) / m_per_deg_lng

    w = summit_lng - half_lng_deg
    e = summit_lng + half_lng_deg
    s = summit_lat - half_lat_deg
    n = summit_lat + half_lat_deg
    bbox = (w, s, e, n)

    with rasterio.open(dtm_path) as src:
        # Intersect with raster bounds in case the requested window
        # spills past the DTM extent.
        rw = max(w, src.bounds.left)
        re = min(e, src.bounds.right)
        rs = max(s, src.bounds.bottom)
        rn = min(n, src.bounds.top)
        if not (rw < re and rs < rn):
            raise RuntimeError(
                f"Requested bbox {bbox} does not intersect DTM bounds {src.bounds}"
            )
        window = from_bounds(rw, rs, re, rn, transform=src.transform)
        # Read the source window full-res, then resample to size x size.
        src_data = src.read(
            1,
            window=window,
            resampling=Resampling.bilinear,
            out_shape=(int(window.height), int(window.width)),
        )
        src_transform = src.window_transform(window)
        src_nodata = src.nodata if src.nodata is not None else -32767

    # Build the destination array and transform spanning the original bbox.
    dst = np.empty((size, size), dtype=np.float32)
    dst_transform = rasterio.transform.from_bounds(rw, rs, re, rn, size, size)
    reproject(
        source=src_data,
        destination=dst,
        src_transform=src_transform,
        src_crs="EPSG:4326",
        dst_transform=dst_transform,
        dst_crs="EPSG:4326",
        resampling=Resampling.bilinear,
        src_nodata=src_nodata,
        dst_nodata=np.nan,
    )

    # Fill any NaNs (edges, no-data) by nearest-neighbour replacement.
    if np.isnan(dst).any():
        from scipy.ndimage import distance_transform_edt

        mask = np.isnan(dst)
        if mask.all():
            raise RuntimeError("All values NaN after resample; check bbox.")
        idx = distance_transform_edt(mask, return_distances=False, return_indices=True)
        dst = dst[tuple(idx)]

    # Effective cell size in metres (average of x and y).
    cell_lng_m = ((re - rw) / size) * m_per_deg_lng
    cell_lat_m = ((rn - rs) / size) * m_per_deg_lat
    cell_size_m = (cell_lng_m + cell_lat_m) / 2

    # Use the actually-cropped bbox (may be smaller than requested if clipped).
    return dst, (rw, rs, re, rn), cell_size_m


def write_heightmap_png(elev: np.ndarray, out_path: Path) -> tuple[float, float]:
    """Encode elevations into 16-bit (R=hi, G=lo) RGBA PNG. Returns (min, max)."""
    emin = float(np.nanmin(elev))
    emax = float(np.nanmax(elev))
    erange = max(emax - emin, 1e-6)
    norm = np.clip((elev - emin) / erange, 0.0, 1.0)
    q = (norm * 65535.0 + 0.5).astype(np.uint32)
    hi = ((q >> 8) & 0xFF).astype(np.uint8)
    lo = (q & 0xFF).astype(np.uint8)
    h, w = elev.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0] = hi
    rgba[..., 1] = lo
    rgba[..., 2] = 0
    rgba[..., 3] = 255
    Image.fromarray(rgba, mode="RGBA").save(out_path, format="PNG", optimize=True)
    return emin, emax


# ---------- Hydrology ---------------------------------------------------------


def compute_streams(
    elev: np.ndarray,
    bbox: tuple[float, float, float, float],
    cell_size_m: float,
    mainstem_frac: float,
    branch_frac: float,
) -> tuple[list[LineString], list[LineString], np.ndarray]:
    """Return (mainstem_lines, branch_lines, accumulation_grid)."""
    if Grid is None:
        raise RuntimeError("pysheds not installed in this env")

    w, s, e, n = bbox
    rows, cols = elev.shape

    # Build a Grid from the in-memory array.  pysheds uses an affine
    # transform (a, b, c, d, e, f) mapping (col, row) → (x, y); rows count
    # downward so the y-scale is negative.
    affine = rasterio.transform.from_bounds(w, s, e, n, cols, rows)
    grid = Grid.from_raster(
        # pysheds needs a Raster; build one via a temporary in-memory file.
        _to_temp_raster(elev, affine),
    )
    dem = grid.read_raster(_temp_path)

    flooded = grid.fill_depressions(dem)
    inflated = grid.resolve_flats(flooded)
    fdir = grid.flowdir(inflated)
    acc = grid.accumulation(fdir)
    acc_arr = np.asarray(acc, dtype=np.float64)

    # Stream masks
    max_acc = float(acc_arr.max())
    if max_acc <= 0:
        return [], [], acc_arr
    mainstem_mask = acc_arr >= mainstem_frac * max_acc
    branch_mask = (acc_arr >= branch_frac * max_acc) & ~mainstem_mask

    mainstem_lines = _mask_to_lines(mainstem_mask, affine, min_pixels=8)
    branch_lines = _mask_to_lines(branch_mask, affine, min_pixels=6)

    return mainstem_lines, branch_lines, acc_arr


_temp_path: str | None = None


def _to_temp_raster(arr: np.ndarray, affine) -> str:
    """Write the array to a temp GeoTIFF that pysheds can open."""
    import tempfile

    global _temp_path
    fd, path = tempfile.mkstemp(suffix=".tif")
    os.close(fd)
    profile = dict(
        driver="GTiff",
        height=arr.shape[0],
        width=arr.shape[1],
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=affine,
        nodata=-32767.0,
    )
    with rasterio.open(path, "w", **profile) as dst:
        dst.write(arr.astype(np.float32), 1)
    _temp_path = path
    return path


def _mask_to_lines(
    mask: np.ndarray, affine, min_pixels: int
) -> list[LineString]:
    """Skeletonise the stream mask, then trace each connected skeleton
    into one polyline per branch between junctions/endpoints.
    """
    from skimage.morphology import skeletonize

    skel = skeletonize(mask)
    if not skel.any():
        return []

    # 8-neighbour degree of every skeleton pixel
    nb_kernel = np.ones((3, 3), dtype=np.uint8)
    nb_kernel[1, 1] = 0
    from scipy.signal import convolve2d

    deg = convolve2d(skel.astype(np.uint8), nb_kernel, mode="same", boundary="fill")
    deg = deg * skel  # only count on skeleton pixels

    rows, cols = skel.shape
    visited = np.zeros_like(skel, dtype=bool)
    lines: list[LineString] = []

    def neighbours(r, c):
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and skel[nr, nc]:
                    yield nr, nc

    # Walk from every endpoint/junction along its branches.
    seed_mask = (deg == 1) | (deg >= 3)
    seeds = list(zip(*np.where(seed_mask)))
    # Also seed any isolated loops by walking from one pixel.
    extra_seeds = list(zip(*np.where(skel & ~seed_mask)))

    def walk(r0, c0, r1, c1):
        path = [(r0, c0), (r1, c1)]
        visited_edge = {(r0, c0, r1, c1), (r1, c1, r0, c0)}
        cur_r, cur_c, prev_r, prev_c = r1, c1, r0, c0
        while True:
            if deg[cur_r, cur_c] != 2:
                break
            nxt = None
            for nr, nc in neighbours(cur_r, cur_c):
                if (nr, nc) == (prev_r, prev_c):
                    continue
                if (cur_r, cur_c, nr, nc) in visited_edge:
                    continue
                nxt = (nr, nc)
                break
            if nxt is None:
                break
            visited_edge.add((cur_r, cur_c, nxt[0], nxt[1]))
            visited_edge.add((nxt[0], nxt[1], cur_r, cur_c))
            path.append(nxt)
            prev_r, prev_c = cur_r, cur_c
            cur_r, cur_c = nxt
        return path, visited_edge

    edges_done: set[tuple[int, int, int, int]] = set()
    for r, c in seeds:
        for nr, nc in neighbours(r, c):
            if (r, c, nr, nc) in edges_done:
                continue
            path, used = walk(r, c, nr, nc)
            edges_done |= used
            if len(path) < max(2, min_pixels // 2):
                continue
            pts = [affine * (float(cc) + 0.5, float(rr) + 0.5) for rr, cc in path]
            lines.append(LineString(pts))
    # Pick up any pure-loop components missed by endpoint seeding.
    for r, c in extra_seeds:
        if visited[r, c]:
            continue
        nbs = list(neighbours(r, c))
        if not nbs:
            continue
        nr, nc = nbs[0]
        if (r, c, nr, nc) in edges_done:
            continue
        path, used = walk(r, c, nr, nc)
        edges_done |= used
        if len(path) < max(2, min_pixels // 2):
            continue
        pts = [affine * (float(cc) + 0.5, float(rr) + 0.5) for rr, cc in path]
        lines.append(LineString(pts))

    return lines


# ---------- Hazard cone & deposition -----------------------------------------


def hazard_cone_polygon(
    elev: np.ndarray,
    bbox: tuple[float, float, float, float],
    cone_drop_m: float,
) -> Polygon | MultiPolygon:
    w, s, e, n = bbox
    rows, cols = elev.shape
    affine = rasterio.transform.from_bounds(w, s, e, n, cols, rows)
    emax = float(elev.max())
    threshold = emax - cone_drop_m
    mask = elev >= threshold
    # Dilate slightly to smooth.
    mask = binary_dilation(mask, iterations=2)
    return _mask_to_polygon(mask, affine)


def _mask_to_polygon(mask: np.ndarray, affine) -> Polygon | MultiPolygon:
    """Vectorise a binary mask to (multi)polygon via rasterio.features.shapes."""
    from rasterio.features import shapes
    from shapely.geometry import shape

    polys = []
    for geom, val in shapes(mask.astype(np.uint8), mask=mask, transform=affine):
        if val != 1:
            continue
        polys.append(shape(geom))
    if not polys:
        return Polygon()
    if len(polys) == 1:
        return polys[0]
    return MultiPolygon(polys)


def laharz_deposition_polygon(
    cone_poly: Polygon | MultiPolygon,
    volume_m3: float,
    affine_meters_buffer: float,
    summit_lat: float,
) -> Polygon | MultiPolygon:
    """Iverson 1998: B = 200 * V^(2/3) planimetric area, A = 0.05 * V^(2/3).

    We approximate the deposition envelope as the cone's downstream
    buffer such that buffer-area + cone-area ≈ B.
    """
    planimetric_area_m2 = 200.0 * (volume_m3 ** (2.0 / 3.0))
    cone_area_m2 = _polygon_area_m2(cone_poly, summit_lat)
    extra = max(planimetric_area_m2 - cone_area_m2, 0.0)
    # Buffer in metres → convert to degrees roughly using lat.
    m_per_deg_lat, m_per_deg_lng = meters_per_degree(summit_lat)
    deg_per_m = 1.0 / ((m_per_deg_lat + m_per_deg_lng) / 2)
    if extra > 0:
        # buffer width such that buffer ring area ~ extra
        # ring_area ≈ perimeter * width; approximate via sqrt(extra/pi).
        buf_m = math.sqrt(extra / math.pi)
        buf_m = max(buf_m, affine_meters_buffer)
        buf_deg = buf_m * deg_per_m
        return cone_poly.buffer(buf_deg)
    return cone_poly


def _polygon_area_m2(poly, summit_lat: float) -> float:
    m_per_deg_lat, m_per_deg_lng = meters_per_degree(summit_lat)
    return poly.area * m_per_deg_lat * m_per_deg_lng


# ---------- LSP candidates ---------------------------------------------------


def lsp_candidates(
    mainstem_lines: list[LineString],
    branch_lines: list[LineString],
    cone_poly: Polygon | MultiPolygon,
    elev: np.ndarray,
    bbox: tuple[float, float, float, float],
    summit_lat: float,
    cone_buffer_m: float = 1500.0,
) -> list[dict]:
    """LSP candidates: highest stream point inside a buffered hazard cone.

    We pick the highest-elevation point of each stream that lies within the
    cone or its buffer ring (default 1.5 km). One candidate per stream.
    """
    w, s, e, n = bbox
    rows, cols = elev.shape
    m_per_deg_lat, m_per_deg_lng = meters_per_degree(summit_lat)
    deg_per_m = 1.0 / ((m_per_deg_lat + m_per_deg_lng) / 2)
    region = cone_poly.buffer(cone_buffer_m * deg_per_m)

    candidates: list[dict] = []
    seen = set()

    def emit(kind: str, idx: int, lines: list[LineString]) -> None:
        for i, line in enumerate(lines):
            best = None
            best_z = -1e9
            for pt in line.coords:
                if not region.contains(Point(pt)):
                    continue
                col = int((pt[0] - w) / (e - w) * cols)
                row = int((n - pt[1]) / (n - s) * rows)
                col = max(0, min(cols - 1, col))
                row = max(0, min(rows - 1, row))
                z = float(elev[row, col])
                if z > best_z:
                    best_z = z
                    best = pt
            if best is None:
                continue
            key = (round(best[0], 4), round(best[1], 4))
            if key in seen:
                continue
            seen.add(key)
            candidates.append(
                dict(
                    lspId=f"{kind}{i}",
                    streamId=f"{kind}{i}",
                    lng=best[0],
                    lat=best[1],
                    elevation=best_z,
                    slv=dict(min=5e5, likely=1e7, max=5e7),
                )
            )

    # Emit LSPs only from mainstem lines (validator only snaps to mainstem)
    # and only at points strictly inside the raw cone (validator checks the
    # raw cone, not the buffered region). Sample every ~spacing_m metres
    # along the line inside the cone so coverage is dense enough that any
    # click on the mainstem in the cone is close to at least one LSP.
    spacing_m = 250.0
    m_per_deg_lat2, m_per_deg_lng2 = meters_per_degree(summit_lat)
    for i, line in enumerate(mainstem_lines):
        inside_pts = [pt for pt in line.coords if cone_poly.contains(Point(pt))]
        if not inside_pts:
            continue
        last_emit = None
        for pt in inside_pts:
            if last_emit is not None:
                dlng = (pt[0] - last_emit[0]) * m_per_deg_lng2
                dlat = (pt[1] - last_emit[1]) * m_per_deg_lat2
                if (dlng * dlng + dlat * dlat) ** 0.5 < spacing_m:
                    continue
            col = int((pt[0] - w) / (e - w) * cols)
            row = int((n - pt[1]) / (n - s) * rows)
            col = max(0, min(cols - 1, col))
            row = max(0, min(rows - 1, row))
            z = float(elev[row, col])
            candidates.append(
                dict(
                    lspId=f"ms{i}_{len([c for c in candidates if c['streamId'] == f'ms{i}'])}",
                    streamId=f"ms{i}",
                    lng=pt[0],
                    lat=pt[1],
                    elevation=z,
                    slv=dict(min=5e5, likely=1e7, max=5e7),
                )
            )
            last_emit = pt

    candidates.sort(key=lambda c: -c["elevation"])
    return candidates


# ---------- GeoJSON helpers --------------------------------------------------


def write_geojson(path: Path, features: list[dict]) -> None:
    fc = {"type": "FeatureCollection", "features": features}
    path.write_text(json.dumps(fc))


def lines_to_features(lines: list[LineString], kind: str) -> list[dict]:
    return [
        {
            "type": "Feature",
            "properties": {"streamId": f"{kind}{i}", "order": 1},
            "geometry": mapping(line),
        }
        for i, line in enumerate(lines)
        if not line.is_empty
    ]


def polygon_to_features(poly, kind: str) -> list[dict]:
    if poly.is_empty:
        return []
    if isinstance(poly, MultiPolygon):
        return [
            {
                "type": "Feature",
                "properties": {"id": f"{kind}{i}"},
                "geometry": mapping(p),
            }
            for i, p in enumerate(poly.geoms)
        ]
    return [
        {
            "type": "Feature",
            "properties": {"id": f"{kind}0"},
            "geometry": mapping(poly),
        }
    ]


def lsp_to_features(candidates: list[dict]) -> list[dict]:
    return [
        {
            "type": "Feature",
            "properties": {
                "lspId": c["lspId"],
                "streamId": c["streamId"],
                "elevation": c["elevation"],
                "slvMin": c["slv"]["min"],
                "slvLikely": c["slv"]["likely"],
                "slvMax": c["slv"]["max"],
            },
            "geometry": {"type": "Point", "coordinates": [c["lng"], c["lat"]]},
        }
        for c in candidates
    ]


# ---------- Main --------------------------------------------------------------


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dtm", required=True, type=Path)
    p.add_argument("--out", required=True, type=Path)
    p.add_argument("--summit-lat", type=float, required=True)
    p.add_argument("--summit-lng", type=float, required=True)
    p.add_argument("--extent-km", type=float, default=12.0)
    p.add_argument("--size", type=int, default=2560)
    p.add_argument("--mainstem-frac", type=float, default=0.01)
    p.add_argument("--branch-frac", type=float, default=0.002)
    p.add_argument(
        "--cone-drop-m",
        type=float,
        default=2400.0,
        help=(
            "Cone covers all elevations above (summit - cone_drop). Make it "
            "large enough that the mainstem streams pass through it; the "
            "client-side validator rejects clicks outside the cone."
        ),
    )
    p.add_argument(
        "--laharz-volume-m3",
        type=float,
        default=1.0e8,
        help="Reference volume for LAHARZ deposition envelope.",
    )
    args = p.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    print(f"[1/6] Crop + resample DTM → {args.size}x{args.size}…", flush=True)
    elev, bbox, cell_size_m = crop_and_resample(
        args.dtm,
        args.summit_lat,
        args.summit_lng,
        args.extent_km,
        args.size,
    )
    print(
        f"      bbox={bbox} cellSize={cell_size_m:.2f}m "
        f"elev=[{elev.min():.1f}, {elev.max():.1f}] m",
        flush=True,
    )

    print("[2/6] Write heightmap.png + heightmap.json…", flush=True)
    emin, emax = write_heightmap_png(elev, args.out / "heightmap.png")
    (args.out / "heightmap.json").write_text(
        json.dumps(
            dict(
                width=args.size,
                height=args.size,
                bbox=list(bbox),
                elevationMin=emin,
                elevationMax=emax,
                cellSizeM=cell_size_m,
            )
        )
    )

    print("[3/6] Stream extraction (pysheds D8)…", flush=True)
    mainstem, branches, acc = compute_streams(
        elev,
        bbox,
        cell_size_m,
        args.mainstem_frac,
        args.branch_frac,
    )
    print(
        f"      mainstem segments={len(mainstem)} branches={len(branches)} "
        f"max_acc={acc.max():.0f}",
        flush=True,
    )
    write_geojson(args.out / "mainstem.geojson", lines_to_features(mainstem, "ms"))
    write_geojson(args.out / "branches.geojson", lines_to_features(branches, "br"))

    print("[4/6] Hazard cone polygon…", flush=True)
    cone = hazard_cone_polygon(elev, bbox, args.cone_drop_m)
    write_geojson(args.out / "hazardCone.geojson", polygon_to_features(cone, "cone"))

    print("[5/6] LAHARZ deposition envelope…", flush=True)
    deposition = laharz_deposition_polygon(
        cone,
        args.laharz_volume_m3,
        affine_meters_buffer=cell_size_m * 3,
        summit_lat=args.summit_lat,
    )
    deposition = unary_union([deposition, cone])
    write_geojson(
        args.out / "deposition.geojson", polygon_to_features(deposition, "dep")
    )

    print("[6/6] LSP candidates…", flush=True)
    lsp = lsp_candidates(mainstem, branches, cone, elev, bbox, args.summit_lat)
    write_geojson(args.out / "lspCandidates.geojson", lsp_to_features(lsp))
    print(f"      {len(lsp)} LSP candidates", flush=True)

    print("Done.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
