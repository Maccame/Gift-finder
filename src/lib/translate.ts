// Traduction à partir d'un jeu de messages, sans importer les fichiers de langue : utilisable dans
// le navigateur, qui ne reçoit que les messages de sa langue.
import type fr from "@/i18n/fr.json";
import type { Locale } from "./types";

/** Clés de traduction, typées sur `fr.json` (fichier de référence). */
export type MessageKey = keyof typeof fr;
/** Une valeur est un texte, ou un objet de formes plurielles (`one`, `other`…). */
export type MessageValue = string | Partial<Record<Intl.LDMLPluralRule, string>>;
export type Messages = Record<MessageKey, MessageValue>;
export type Params = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: Params) => string;

/**
 * Remplace `{param}` et choisit la forme plurielle avec
 * `Intl.PluralRules(locale).select(params.count)`.
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
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (params[name] === undefined ? match : String(params[name])));
}

export function createTranslator(messages: Messages, locale: Locale): Translator {
  return (key, params) => translate(messages, locale, key, params);
}
