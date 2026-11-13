// Traductions de l'interface (principe III, research R6). La langue vient de l'URL uniquement.
import fr from "@/i18n/fr.json";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";
import de from "@/i18n/de.json";
import type { Labels, Locale } from "./types";

export const LOCALES = ["fr", "en", "es", "de"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "fr";

/** Clés de traduction, typées sur `fr.json` (fichier de référence). */
export type MessageKey = keyof typeof fr;
/** Une valeur est un texte, ou un objet de formes plurielles (`one`, `other`…). */
export type MessageValue = string | Partial<Record<Intl.LDMLPluralRule, string>>;
export type Messages = Record<MessageKey, MessageValue>;
export type Params = Record<string, string | number>;

const ALL: Record<Locale, Messages> = {
  fr: fr as Messages,
  en: en as Messages,
  es: es as Messages,
  de: de as Messages,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Langue du premier segment de l'URL (`/en/…`), `fr` par défaut. */
export function getLocaleFromUrl(url: URL | string): Locale {
  const { pathname } = typeof url === "string" ? new URL(url, "http://localhost") : url;
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function messagesFor(locale: Locale): Messages {
  return ALL[locale];
}

/**
 * Traduit une clé à partir d'un jeu de messages : remplace `{param}` et choisit la forme plurielle
 * avec `Intl.PluralRules(locale).select(params.count)`. Utilisable côté navigateur, qui ne reçoit
 * que les messages de sa langue.
 */
export function translate(messages: Messages, locale: Locale, key: MessageKey, params?: Params): string {
  const value = messages[key];
  let text: string;
  if (value === undefined) {
    text = key;
  } else if (typeof value === "string") {
    text = value;
  } else {
    const count = Number(params?.count ?? 0);
    const rule = new Intl.PluralRules(locale).select(count);
    text = value[rule] ?? value.other ?? key;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  );
}

export function t(locale: Locale, key: MessageKey, params?: Params): string {
  return translate(ALL[locale], locale, key, params);
}

/** Libellé d'une entrée de référence (occasion, relation, budget, centre d'intérêt). */
export function label(entry: { labels: Labels }, locale: Locale): string {
  return entry.labels[locale];
}
