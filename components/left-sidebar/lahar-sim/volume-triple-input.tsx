"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import type { VolumeTriple } from "@/lib/lahar/types";

interface Props {
  value: VolumeTriple;
  onChange: (v: VolumeTriple) => void;
}

export default function VolumeTripleInput({ value, onChange }: Props) {
  const { t } = useTranslation();
  const fields: Array<keyof VolumeTriple> = ["min", "likely", "max"];
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500 dark:text-slate-400">
        Volume ({t.simulation.volume.unit})
      </span>
      <div className="flex gap-2">
        {fields.map((k) => (
          <label key={k} className="flex-1 flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">
              {t.simulation.volume[k]}
            </span>
            <input
              type="number"
              min={0}
              value={value[k]}
              onChange={(e) =>
                onChange({ ...value, [k]: Math.max(0, Number(e.target.value)) })
              }
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1.5"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
