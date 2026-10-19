"use client";

import { useMemo, useState } from "react";

import TerrainViewer from "@/components/half-3d/TerrainViewerDynamic";
import { getVolcano, VOLCANOES } from "@/lib/catalog";
import type { EpochInfo } from "@/lib/half-3d/types";
import { useTranslation } from "@/lib/i18n";

const SLICED = VOLCANOES.filter((v) => v.slices.length > 0);

export default function SliceComparisonPage() {
  const { t } = useTranslation();
  // Client-only page (the language provider renders nothing on the server).
  const [selectedId, setSelectedId] = useState(() => {
    const code =
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("v");
    const volcano = code ? getVolcano(code) : undefined;
    return volcano?.slices.length ? volcano.id : (SLICED[0]?.id ?? "");
  });

  const selected = SLICED.find((v) => v.id === selectedId) ?? SLICED[0];
  const epochs: EpochInfo[] = useMemo(
    () =>
      (selected?.slices ?? []).map((s) => ({
        id: s.code,
        label: `${s.code} · ${s.label}`,
        url: s.url,
        color: s.color,
      })),
    [selected],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-canvas px-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex h-[43px] items-center gap-0.5 rounded-full bg-surface p-1" role="tablist">
          {SLICED.map((volcano) => (
            <button
              key={volcano.id}
              type="button"
              role="tab"
              aria-selected={selected?.id === volcano.id}
              onClick={() => setSelectedId(volcano.id)}
              className={`flex h-full items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors ${
                selected?.id === volcano.id
                  ? "bg-brand font-bold text-white"
                  : "font-semibold text-ink-body hover:bg-brand-soft"
              }`}
            >
              <span className="font-mono text-[10.5px] opacity-70">{volcano.code}</span>
              {volcano.name}
              <span className="font-mono text-[10.5px] opacity-70">{volcano.slices.length}</span>
            </button>
          ))}
        </div>
        <p className="hidden text-[12.5px] text-muted md:block">{t.landing.sliceDescription}</p>
      </div>
      <main className="relative min-h-0 flex-1 overflow-hidden rounded-[24px] bg-[#0F1419]">
        {selected && <TerrainViewer key={selected.id} epochs={epochs} />}
      </main>
    </div>
  );
}
