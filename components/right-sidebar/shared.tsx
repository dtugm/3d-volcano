"use client";

import type { ReactNode } from "react";

/** Skeleton placeholder rows used while a panel loads. */
export function PanelSkeleton({ rows = 3, hero = false }: { rows?: number; hero?: boolean }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {hero && <div className="h-12 w-2/3 rounded-lg skeleton" />}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-6 rounded-lg skeleton" />
      ))}
    </div>
  );
}

/** Warning box with a retry text button. */
export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-[12px] text-warn-fg">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 cursor-pointer font-semibold text-brand hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

/** "Nothing detected" row with an OK pill. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-[12.5px] text-ink-body">
      <span className="size-2 shrink-0 rounded-full bg-ok" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function MoreRows({ count }: { count: number }) {
  if (count <= 0) return null;
  return <p className="px-1 pt-0.5 text-[11.5px] text-muted">+{count} more</p>;
}

