import type { Locale } from "./types";

export const LOCALES = ["fr", "en", "es", "de"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
