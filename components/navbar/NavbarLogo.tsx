"use client";

import Link from "next/link";
import React from "react";

import { VolcanoLogo } from "@/components/site/VolcanoLogo";
import { useTranslation } from "@/lib/i18n";

export const NavbarLogo: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-full" aria-label={t.nav.home}>
      <VolcanoLogo className="h-9 w-10 shrink-0 text-brand" />
      <span className="hidden leading-tight sm:block">
        <span className="block text-[14px] font-extrabold text-ink">{t.navbar.title}</span>
        <span className="block text-[11px] font-medium text-muted">Geo-AIT · UGM</span>
      </span>
    </Link>
  );
};
