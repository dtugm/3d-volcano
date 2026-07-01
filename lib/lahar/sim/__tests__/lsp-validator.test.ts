import { lineString, polygon } from "@turf/turf";
import { describe, expect, it } from "vitest";

import { validateLSPClick } from "@/lib/lahar/lsp-validator";
import type { LSPCandidate } from "@/lib/lahar/types";

const mainstem = {
  type: "FeatureCollection" as const,
  features: [
    lineString(
      [
        [110.0, -7.95],
        [110.001, -7.94],
        [110.002, -7.93],
      ],
      { streamId: "s1" },
    ),
  ],
};

const depositionPoly = polygon([
  [
    [109.999, -7.96],
    [110.003, -7.96],
    [110.003, -7.92],
    [109.999, -7.92],
    [109.999, -7.96],
  ],
]);

const hazardCone = polygon([
  [
    [109.99, -7.97],
    [110.01, -7.97],
    [110.01, -7.91],
    [109.99, -7.91],
    [109.99, -7.97],
  ],
]);

const candidates: LSPCandidate[] = [
  {
    lspId: "lsp-1",
    streamId: "s1",
    lng: 110.001,
    lat: -7.94,
    elevation: 1500,
    slv: { min: 5000, likely: 8000, max: 12000 },
  },
];

const data = {
  mainstem,
  deposition: { type: "FeatureCollection" as const, features: [depositionPoly] },
  hazardCone: { type: "FeatureCollection" as const, features: [hazardCone] },
  lspCandidates: candidates,
};

describe("validateLSPClick", () => {
  it("rejects clicks far from any mainstem", () => {
    const r = validateLSPClick({ lng: 110.5, lat: -7.5 }, data, { snapToleranceM: 30 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("outside_stream");
  });

  it("rejects clicks outside hazard cone", () => {
    const r = validateLSPClick({ lng: 110.001, lat: -7.94 }, data, {
      snapToleranceM: 30,
      hazardConeOverride: {
        type: "FeatureCollection",
        features: [
          polygon([[[120, -7], [121, -7], [121, -6], [120, -6], [120, -7]]]),
        ],
      },
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("below_hazard_cone");
  });

  it("snaps to nearest LSP candidate when within tolerance", () => {
    const r = validateLSPClick({ lng: 110.001, lat: -7.94 }, data, { snapToleranceM: 30 });
    expect(r.ok).toBe(true);
    expect(r.candidate?.lspId).toBe("lsp-1");
  });

  it("rejects when no LSP candidate (junction) is within 150m", () => {
    const dataNoCands = { ...data, lspCandidates: [] };
    const r = validateLSPClick(
      { lng: 110.001, lat: -7.94 },
      dataNoCands,
      { snapToleranceM: 30 },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("not_at_junction");
  });
});
