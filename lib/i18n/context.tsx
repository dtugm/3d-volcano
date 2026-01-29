"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

import { translations } from "./translations";
import type { LanguageContextValue,Locale } from "./types";

const STORAGE_KEY = "preferred-language";
const DEFAULT_LOCALE: Locale = "id";

const LanguageContext = createContext<LanguageContextValue | null>(null);

// External store for locale
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Locale | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "id") return stored;
  return DEFAULT_LOCALE;
}

function getServerSnapshot(): null {
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore handles SSR correctly:
  // - Server: returns null (from getServerSnapshot)
  // - Client: returns locale from localStorage (from getSnapshot)
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((newLocale: Locale) => {
    localStorage.setItem(STORAGE_KEY, newLocale);
    emitChange();
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        emitChange();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Don't render children until locale is loaded (null on server, value on client)
  if (locale === null) {
    return null;
  }

  const value: LanguageContextValue = {
    locale,
    setLocale,
    t: translations[locale],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
