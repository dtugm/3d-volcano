"use client";

import dynamic from "next/dynamic";

// MapLibre, workers and WebGL are client-only.
const TwinPage = dynamic(() => import("@/features/twin/TwinPage"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-canvas">
      <span className="size-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" />
    </div>
  ),
});

export default function DigitalTwinPage() {
  return <TwinPage />;
}
