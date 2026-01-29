"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import { Mountain, MOUNTAINS } from "./types";

interface VolcanoContextValue {
  mountains: Mountain[];
  activeMountainId: string;
  activeMountain: Mountain | undefined;
  setActiveMountainId: (id: string) => void;
}

const VolcanoContext = createContext<VolcanoContextValue | null>(null);

export function VolcanoProvider({ children }: { children: ReactNode }) {
  const [activeMountainId, setActiveMountainIdState] = useState<string>(
    MOUNTAINS[0].id,
  );

  const setActiveMountainId = useCallback((id: string) => {
    setActiveMountainIdState(id);
  }, []);

  const activeMountain = MOUNTAINS.find((m) => m.id === activeMountainId);

  return (
    <VolcanoContext.Provider
      value={{
        mountains: MOUNTAINS,
        activeMountainId,
        activeMountain,
        setActiveMountainId,
      }}
    >
      {children}
    </VolcanoContext.Provider>
  );
}

export function useVolcano() {
  const context = useContext(VolcanoContext);
  if (!context) {
    throw new Error("useVolcano must be used within a VolcanoProvider");
  }
  return context;
}
