/**
 * LAHARZ inundation areas and confidence limits, ported from pearpy
 * (https://github.com/ruliandaru/pearpy, `distal_inundation.py` +
 * `textfile.py`, MIT © Ruli Andaru).
 *
 * Iverson, Schilling & Vallance (1998): cross-sectional area
 * A = 0.05·V^(2/3) and planimetric area B = 200·V^(2/3), with prediction
 * bounds after Griswold & Iverson (2008).
 */

/** [volume m³, cross-section area m²] — pearpy `py_xxsecta`. */
const CROSS_SECTION_CALIBRATION: [number, number][] = [
  [4000000000, 150000], [250000000, 37000], [180000000, 14000],
  [150000000, 10000], [73000000, 12000], [40000000, 5000],
  [40000000, 2300], [30000000, 1100], [16000000, 2000],
  [15000000, 19000], [14000000, 2100], [12000000, 1500],
  [1200000, 200], [600000, 190], [380000, 320],
  [380000, 300], [300000, 200], [80000, 300],
];

/** [volume m³, planimetric area m²] — pearpy `py_xxplanb`. */
const PLANIMETRIC_CALIBRATION: [number, number][] = [
  [4000000000, 550000000], [1800000000, 140000000], [250000000, 60000000],
  [200000000, 50000000], [180000000, 90000000], [150000000, 78000000],
  [100000000, 34000000], [73000000, 55000000], [66000000, 27000000],
  [50000000, 20000000], [40000000, 4500000], [40000000, 34000000],
  [30000000, 6000000], [16000000, 11000000], [15000000, 16000000],
  [15000000, 6000000], [14000000, 18000000], [12000000, 30000000],
  [4000000, 8000000], [1500000, 3000000], [1200000, 1800000],
  [600000, 1000000], [380000, 750000], [380000, 500000],
  [300000, 200000], [140000, 400000], [80000, 470000],
];

export const CONFIDENCE_LIMITS = [50, 70, 80, 90, 95, 97.5, 99] as const;
export type ConfidenceLimit = (typeof CONFIDENCE_LIMITS)[number];

/**
 * Two-sided Student-t values for the only two rows pearpy reads:
 * df = 17 (cross-sections, n = 18) and df = 26 (planimetric, n = 27).
 */
const T_TABLE: Record<number, number[]> = {
  17: [0.689195, 1.069033, 1.333379, 1.739607, 2.109816, 2.458051, 2.898231],
  26: [0.684043, 1.057523, 1.314972, 1.705618, 2.055529, 2.378786, 2.778715],
};

export const MIN_VOLUME = 32;

function confidenceBounds(
  isCrossSection: boolean,
  volume: number,
  confidence: ConfidenceLimit,
): [number, number] {
  const intercept = isCrossSection ? -1.301 : 2.301;
  const coefficient = isCrossSection ? 0.05 : 200;
  const fills = isCrossSection ? CROSS_SECTION_CALIBRATION : PLANIMETRIC_CALIBRATION;

  let residualSum = 0;
  let totalLogVolume = 0;
  for (const [v, area] of fills) {
    const logVol = Math.log10(v);
    totalLogVolume += logVol;
    const diff = Math.log10(area) - (logVol * 0.666666666667 + intercept);
    residualSum += diff * diff;
  }
  const seModel = Math.sqrt(residualSum / (fills.length - 1));
  const meanLogVolume = totalLogVolume / fills.length;
  let meanDiffTotal = 0;
  for (const [v] of fills) meanDiffTotal += (Math.log10(v) - meanLogVolume) ** 2;

  const t = T_TABLE[fills.length - 1][CONFIDENCE_LIMITS.indexOf(confidence)];
  const regressArea = Math.round(volume ** 0.66666666666667 * coefficient);
  const diffMeanSq = (Math.log10(volume) - meanLogVolume) ** 2;
  const sem = seModel * Math.sqrt(1 / fills.length + diffMeanSq / meanDiffTotal);
  const sep = Math.sqrt(seModel ** 2 + sem ** 2);
  return [
    10 ** (t * sep + Math.log10(regressArea)),
    10 ** (Math.log10(regressArea) - t * sep),
  ];
}

export interface LaharzAreas {
  /** Cross-section areas [upper CL, central, lower CL], m², descending. */
  cross: number[];
  /** Planimetric areas [upper CL, central, lower CL], m², descending. */
  planimetric: number[];
}

/** pearpy `calc_cross_planimetric` for a single volume. */
export function laharzAreas(volume: number, confidence: ConfidenceLimit): LaharzAreas {
  const central = (c: number) => Math.round(volume ** 0.666666666666666 * c);
  const [crossUp, crossDn] = confidenceBounds(true, volume, confidence);
  const [planUp, planDn] = confidenceBounds(false, volume, confidence);
  const desc = (a: number, b: number) => b - a;
  return {
    cross: [central(0.05), Math.round(crossUp), Math.round(crossDn)].sort(desc),
    planimetric: [central(200), Math.round(planUp), Math.round(planDn)].sort(desc),
  };
}
