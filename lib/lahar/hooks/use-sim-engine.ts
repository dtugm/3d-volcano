"use client";

import { useEffect, useState } from "react";

import type { HeightmapMeta, MaterialProfileId, SimSnapshot } from "../types";

interface UseSimEngineArgs {
  heightmapUrl?: string;
  heightmapMeta?: HeightmapMeta;
  profileId: MaterialProfileId;
  enabled: boolean;
}

// ponytail: gimmick engine — UI affordances only, no physics worker.
// Real solver plugs back in by restoring the worker-based implementation
// once Vercel web-worker bundling is stable on the deployment target.
export function useSimEngine({ enabled }: UseSimEngineArgs) {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Fake terrain-init delay — fires after 900 ms and marks engine ready.
    const t = setTimeout(() => setReady(true), 900);
    return () => {
      clearTimeout(t);
      // Cleanup resets state; cleanup callbacks are allowed by the rule.
      setReady(false);
      setRunning(false);
    };
  }, [enabled]);

  return {
    ready: enabled && ready,
    snapshot: null as SimSnapshot | null,
    running: enabled && ready && running,
    setRunning,
    setSource(_r: number, _c: number) {},
    setProfile(_id: MaterialProfileId) {},
    setBudget(_m3: number | null) {},
    reset() { setRunning(false); },
  };
}
