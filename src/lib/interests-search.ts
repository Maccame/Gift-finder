// Recherche locale dans le référentiel des centres d'intérêt (FR-006, research R7) : aucun appel réseau.
import interestsData from "@/data/interests.json";
import type { Interest, Locale } from "./types";

const INTERESTS = interestsData as Interest[];

/** Minuscules, accents retirés (NFD), espaces réduits. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const words = (label: string) => normalize(label).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

const byLabel = (locale: Locale) => (a: Interest, b: Interest) => a.labels[locale].localeCompare(b.labels[locale], locale);

/** Centres d'intérêt dont un mot du libellé commence par la requête, triés par ordre alphabétique. */
export function searchInterests(query: string, locale: Locale, excludeIds: readonly string[]): Interest[] {
  const q = normalize(query);
  if (!q) return [];
  const excluded = new Set(excludeIds);
  const qWords = q.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return INTERESTS.filter((interest) => {
    if (excluded.has(interest.id)) return false;
    const labelWords = words(interest.labels[locale]);
    // Chaque mot tapé doit commencer un mot du libellé (« cuisine asi » → « Cuisine asiatique »).
    return qWords.every((qw) => labelWords.some((w) => w.startsWith(qw)));
  }).sort(byLabel(locale));
}

export interface CategoryGroup {
  category: string;
  interests: Interest[];
}

/** Tout le référentiel regroupé par catégorie, dans l'ordre du fichier, libellés triés. */
export function byCategory(locale: Locale, excludeIds: readonly string[]): CategoryGroup[] {
  const excluded = new Set(excludeIds);
  const groups = new Map<string, Interest[]>();
  for (const interest of INTERESTS) {
    if (!groups.has(interest.category)) groups.set(interest.category, []);
    if (!excluded.has(interest.id)) groups.get(interest.category)!.push(interest);
  }
  return [...groups].map(([category, list]) => ({ category, interests: list.sort(byLabel(locale)) }));
}

export function interestById(id: string): Interest | undefined {
  return INTERESTS.find((i) => i.id === id);
}
