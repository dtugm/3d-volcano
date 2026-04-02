"use client";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import React, { useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n";

import { LanguagesIcon, SunIcon } from "../icons";

export const LanguageButton: React.FC = () => {
  const { locale, toggleLocale } = useTranslation();

  return (
    <button
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
      onClick={toggleLocale}
      aria-label={`Switch to ${locale === "en" ? "Indonesian" : "English"}`}
    >
      <LanguagesIcon className="w-4 h-4" aria-hidden="true" />
      <span className="uppercase font-medium text-xs">{locale}</span>
    </button>
  );
};

export const ThemeButton: React.FC<{ onToggleTheme: VoidFunction }> = ({
  onToggleTheme,
}) => (
  <button
    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
    onClick={onToggleTheme}
  >
    <SunIcon className="w-4 h-4" aria-hidden="true" />
  </button>
);

const PAGES = [
  { path: "/", label: "Main Viewer" },
  { path: "/half-3d", label: "3D Terrain" },
];

const PageSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const current = PAGES.find((p) => p.path === pathname) ?? PAGES[0];

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300 text-xs font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        {current.label}
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-36 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden z-50">
          {PAGES.map((page) => (
            <button
              key={page.path}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                pathname === page.path
                  ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              onClick={() => {
                router.push(page.path);
                setOpen(false);
              }}
            >
              {page.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const NavbarActions: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleToggleTheme = () => {
    console.log("handleTheme", theme);
    switch (theme) {
      case "light":
      case "system":
        setTheme("dark");
        break;
      case "dark":
        setTheme("light");
      case "system":
      default:
        break;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <PageSwitcher />
      <LanguageButton />
      <ThemeButton onToggleTheme={handleToggleTheme} />
    </div>
  );
};
