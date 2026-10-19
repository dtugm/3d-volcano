"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import React from "react";

import { DesignIcon } from "@/components/site/DesignIcon";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n";

const roundButton =
  "grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink-body transition-colors hover:bg-brand-soft";

export const LanguageButton: React.FC = () => {
  const { locale, toggleLocale } = useTranslation();
  return (
    <button
      type="button"
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[12px] font-bold text-ink-body uppercase transition-colors hover:bg-brand-soft"
      onClick={toggleLocale}
      aria-label={`Switch to ${locale === "en" ? "Indonesian" : "English"}`}
    >
      <DesignIcon name="lang" size={16} />
      {locale}
    </button>
  );
};

export const ThemeButton: React.FC<{ onToggleTheme: VoidFunction }> = ({ onToggleTheme }) => {
  const { resolvedTheme } = useTheme();
  return (
    <button type="button" className={roundButton} onClick={onToggleTheme} aria-label="Toggle theme">
      <DesignIcon name={resolvedTheme === "dark" ? "sun" : "moon"} size={16} />
    </button>
  );
};

/** Pill navigation between the site's pages. */
export const ModuleTabs: React.FC<{ className?: string }> = ({ className }) => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const tabs = [
    { href: "/", label: t.nav.home },
    { href: "/digital-twin", label: t.nav.digitalTwin },
    { href: "/slice-comparison", label: t.nav.sliceComparison },
  ];

  return (
    <nav
      aria-label="Modules"
      className={cn("flex h-[43px] items-center gap-0.5 rounded-full bg-surface p-1", className)}
    >
      {tabs.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-full items-center rounded-full px-3.5 text-[13px] whitespace-nowrap transition-colors duration-300",
              active ? "bg-brand font-bold text-white" : "font-semibold text-ink-body hover:bg-brand-soft",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export const NavbarActions: React.FC = () => {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <LanguageButton />
      <ThemeButton onToggleTheme={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} />
    </div>
  );
};
