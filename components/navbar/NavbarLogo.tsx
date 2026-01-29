"use client";

import React from "react";

import { useTranslation } from "@/lib/i18n";

import { EarthIcon } from "../icons";

export const NavbarLogo: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#4285F4] rounded-xl flex items-center justify-center">
        <EarthIcon className="w-6 h-6 text-white" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-base font-bold text-slate-900 dark:text-white">
          {t.navbar.title}
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t.navbar.subtitle}
        </p>
      </div>
    </div>
  );
};
