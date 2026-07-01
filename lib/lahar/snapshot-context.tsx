"use client";

import { createContext, ReactNode, useContext } from "react";

import type { SimSnapshot } from "./types";

const SimSnapshotContext = createContext<SimSnapshot | null>(null);

export function SimSnapshotProvider({
  snapshot,
  children,
}: {
  snapshot: SimSnapshot | null;
  children: ReactNode;
}) {
  return (
    <SimSnapshotContext.Provider value={snapshot}>
      {children}
    </SimSnapshotContext.Provider>
  );
}

export function useSimSnapshot(): SimSnapshot | null {
  return useContext(SimSnapshotContext);
}
