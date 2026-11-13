// Traductions de l'interface (principe III, research R6). La langue vient de l'URL uniquement.
import fr from "@/i18n/fr.json";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";
import de from "@/i18n/de.json";
import { translate, type MessageKey, type Messages, type Params } from "./translate";
import { DEFAULT_LOCALE, isLocale } from "./locales";
import type { Labels, Locale } from "./types";

export { translate, type MessageKey, type MessageValue, type Messages, type Params } from "./translate";

export { DEFAULT_LOCALE, isLocale, LOCALES } from "./locales";

const ALL: Record<Locale, Messages> = {
  fr: fr as Messages,
  en: en as Messages,
  es: es as Messages,
  de: de as Messages,
};

/** Langue du premier segment de l'URL (`/en/…`), `fr` par défaut. */
export function getLocaleFromUrl(url: URL | string): Locale {
  const { pathname } = typeof url === "string" ? new URL(url, "http://localhost") : url;
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function messagesFor(locale: Locale): Messages {
  return ALL[locale];
}

export function t(locale: Locale, key: MessageKey, params?: Params): string {
  return translate(ALL[locale], locale, key, params);
}

/** Libellé d'une entrée de référence (occasion, relation, budget, centre d'intérêt). */
export function label(entry: { labels: Labels }, locale: Locale): string {
  return entry.labels[locale];
}
