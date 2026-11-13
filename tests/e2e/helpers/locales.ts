// Textes d'interface par langue, pour parcourir le questionnaire dans les 4 langues.
import { expect, type Page } from "@playwright/test";

export type Locale = "fr" | "en" | "es" | "de";

export interface LocaleUi {
  next: string;
  search: string;
  add: (label: string) => string;
  seeIdeas: string;
  list: string;
  options: [string, string, string];
  interests: string[];
}

export const UI: Record<Locale, LocaleUi> = {
  fr: {
    next: "Suivant",
    search: "Rechercher un centre d'intérêt",
    add: (l) => `Ajouter ${l}`,
    seeIdeas: "Voir les idées",
    list: "Idées cadeaux",
    options: ["Anniversaire", "Ami", "De 50 à 100 €"],
    interests: ["Musicien", "Gamer", "Aime les fleurs", "Cuisine", "Randonnée"],
  },
  en: {
    next: "Next",
    search: "Search for an interest",
    add: (l) => `Add ${l}`,
    seeIdeas: "See gift ideas",
    list: "Gift ideas",
    options: ["Birthday", "Friend", "€50 to €100"],
    interests: ["Musician", "Gamer", "Loves flowers", "Cooking", "Hiking"],
  },
  es: {
    next: "Siguiente",
    search: "Buscar un interés",
    add: (l) => `Añadir ${l}`,
    seeIdeas: "Ver las ideas",
    list: "Ideas de regalo",
    options: ["Cumpleaños", "Amigo", "De 50 a 100 €"],
    interests: ["Músico", "Gamer", "Le encantan las flores", "Cocina", "Senderismo"],
  },
  de: {
    next: "Weiter",
    search: "Nach einem Interesse suchen",
    add: (l) => `${l} hinzufügen`,
    seeIdeas: "Ideen anzeigen",
    list: "Geschenkideen",
    options: ["Geburtstag", "Freund oder Freundin", "50 bis 100 €"],
    interests: ["Musiker", "Gamer", "Liebt Blumen", "Kochen", "Wandern"],
  },
};

export const LOCALES: Locale[] = ["fr", "en", "es", "de"];

/**
 * Parcourt les 4 étapes dans une langue, en appelant `onStep` sur chaque écran (étapes 1 à 4),
 * puis affiche les idées si `submit` vaut true.
 */
export async function walkQuestionnaire(page: Page, locale: Locale, onStep: (step: number) => Promise<void>, submit = true) {
  const ui = UI[locale];
  for (const [index, option] of ui.options.entries()) {
    await onStep(index + 1);
    await page.getByRole("radio", { name: option, exact: true }).check();
    await page.getByRole("button", { name: ui.next }).click();
  }
  for (const label of ui.interests) {
    await page.getByRole("searchbox", { name: ui.search }).fill(label.slice(0, 4));
    await page.getByRole("button", { name: ui.add(label), exact: true }).click();
  }
  await onStep(4);
  if (!submit) return;
  await page.getByRole("button", { name: ui.seeIdeas }).click();
  await expect(page.getByRole("list", { name: ui.list }).locator(":scope > li")).toHaveCount(6);
}
