import { useLanguage } from "./context";

export function useTranslation() {
  const { t, locale, setLocale } = useLanguage();

  const toggleLocale = () => {
    setLocale(locale === "en" ? "id" : "en");
  };

  return { t, locale, setLocale, toggleLocale };
}
