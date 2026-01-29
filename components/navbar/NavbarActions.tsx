"use client";
import { useTheme } from "next-themes";
import React from "react";

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
      <LanguageButton />
      <ThemeButton onToggleTheme={handleToggleTheme} />
    </div>
  );
};
