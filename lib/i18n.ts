export type Locale = "en" | "vi";

export const locales: Locale[] = ["en", "vi"];
export const defaultLocale: Locale = "en";

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
