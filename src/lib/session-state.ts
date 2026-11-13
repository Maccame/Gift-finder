// Mémoire de l'onglet (FR-029) : sessionStorage uniquement, effacé à la fermeture de l'onglet.
// Jamais de cookie, de localStorage ni d'IndexedDB (principe VIII).
import { isLocale } from "./locales";
import type { Draft } from "./criteria";
import type { Criteria, GiftIdea, Selection } from "./types";

export const STORAGE_KEY = "gift-finder:v1";

export type Step = 1 | 2 | 3 | 4;

export interface SessionState {
  step: Step;
  draft: Draft;
  selection: Selection | null;
}

const isStringOrNull = (v: unknown) => v === null || typeof v === "string";
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function isDraft(v: unknown): v is Draft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return isStringOrNull(d.occasionId) && isStringOrNull(d.relationId) && isStringOrNull(d.budgetId) && isStringArray(d.interestIds) && isLocale(d.locale);
}

function isCriteria(v: unknown): v is Criteria {
  if (!isDraft(v)) return false;
  return typeof v.occasionId === "string" && typeof v.relationId === "string" && typeof v.budgetId === "string";
}

function isIdea(v: unknown): v is GiftIdea {
  if (!v || typeof v !== "object") return false;
  const i = v as Record<string, unknown>;
  return (
    typeof i.rank === "number" &&
    typeof i.title === "string" &&
    typeof i.description === "string" &&
    typeof i.priceEur === "number" &&
    isStringArray(i.matchedInterestIds) &&
    Array.isArray(i.links)
  );
}

function isSelection(v: unknown): v is Selection {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return isCriteria(s.criteria) && Array.isArray(s.ideas) && s.ideas.length > 0 && s.ideas.every(isIdea) && typeof s.affiliateDisclosure === "boolean";
}

/** État sauvegardé, ou `null` s'il est absent, illisible ou de forme inattendue. */
export function loadState(): SessionState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const step = value.step;
    if (step !== 1 && step !== 2 && step !== 3 && step !== 4) return null;
    if (!isDraft(value.draft)) return null;
    if (value.selection !== null && !isSelection(value.selection)) return null;
    return { step, draft: value.draft, selection: value.selection as Selection | null };
  } catch {
    return null;
  }
}

export function saveState(state: SessionState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée stricte, quota) : l'état reste en mémoire.
  }
}
