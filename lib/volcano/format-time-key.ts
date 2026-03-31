const YYYY_MM_RE = /^\d{4}-(\d{2})$/;

export function formatTimeKey(key: string, locale: string): string {
  if (YYYY_MM_RE.test(key)) {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString(locale, { month: "short", year: "numeric" });
  }
  return key;
}
