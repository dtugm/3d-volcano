"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import { profilesByKind } from "@/lib/lahar/materials";
import type { MaterialProfileId } from "@/lib/lahar/types";

interface Props {
  kind: "lahar" | "lava";
  value: MaterialProfileId;
  onChange: (id: MaterialProfileId) => void;
}

export default function MaterialSelect({ kind, value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500 dark:text-slate-400">{t.simulation.material}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MaterialProfileId)}
        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5"
      >
        {profilesByKind(kind).map((p) => (
          <option key={p.id} value={p.id}>
            {t.simulation.materialOptions[p.id as keyof typeof t.simulation.materialOptions]}
          </option>
        ))}
      </select>
    </label>
  );
}
