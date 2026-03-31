"use client";

import React, { useCallback, useEffect, useRef } from "react";

import { useTranslation } from "@/lib/i18n";
import { formatTimeKey, useVolcano } from "@/lib/volcano";

export default function SplitSlider() {
  const {
    comparisonEnabled,
    splitPosition,
    setSplitPosition,
    comparisonLeftYear,
    comparisonRightYear,
  } = useVolcano();
  const { locale } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSplitPosition(x / rect.width);
    },
    [setSplitPosition],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  if (!comparisonEnabled) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-10">
      {/* Year labels */}
      <div
        className="absolute top-4 pointer-events-none text-sm font-mono font-semibold bg-black/60 text-white px-2 py-1 rounded"
        style={{ left: `calc(${splitPosition * 100}% - 80px)` }}
      >
        {formatTimeKey(comparisonLeftYear, locale)}
      </div>
      <div
        className="absolute top-4 pointer-events-none text-sm font-mono font-semibold bg-black/60 text-white px-2 py-1 rounded"
        style={{ left: `calc(${splitPosition * 100}% + 16px)` }}
      >
        {formatTimeKey(comparisonRightYear, locale)}
      </div>

      {/* Draggable divider */}
      <div
        className="absolute top-0 bottom-0 pointer-events-auto cursor-col-resize"
        style={{
          left: `calc(${splitPosition * 100}% - 16px)`,
          width: "32px",
        }}
        onPointerDown={handlePointerDown}
      >
        {/* Visible line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
        {/* Handle grip */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
            <rect x="2" y="0" width="2" height="16" rx="1" fill="#94a3b8" />
            <rect x="8" y="0" width="2" height="16" rx="1" fill="#94a3b8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
