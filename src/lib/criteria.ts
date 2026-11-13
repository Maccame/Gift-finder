// Critères saisis : validation (data-model §3) et statut du bouton (FR-010, FR-018).
import { z } from "zod";
import occasions from "@/data/occasions.json";
import relations from "@/data/relations.json";
import budgets from "@/data/budgets.json";
import interests from "@/data/interests.json";
import { LOCALES } from "./i18n";
import type { Criteria, Locale } from "./types";

export const MIN_INTERESTS = 5;
export const MAX_INTERESTS = 10;

const OCCASION_IDS = new Set(occasions.map((o) => o.id));
const RELATION_IDS = new Set(relations.map((r) => r.id));
const BUDGET_IDS = new Set(budgets.map((b) => b.id));
const INTEREST_IDS = new Set(interests.map((i) => i.id));

export const CriteriaSchema = z
  .object({
    occasionId: z.string().refine((id) => OCCASION_IDS.has(id)),
    relationId: z.string().refine((id) => RELATION_IDS.has(id)),
    budgetId: z.string().refine((id) => BUDGET_IDS.has(id)),
    interestIds: z
      .array(z.string().refine((id) => INTEREST_IDS.has(id)))
      .min(MIN_INTERESTS)
      .max(MAX_INTERESTS)
      .refine((ids) => new Set(ids).size === ids.length),
    locale: z.enum(LOCALES),
  })
  .strict();

/** Brouillon en cours de saisie : les étapes non remplies valent `null`. */
export interface Draft {
  occasionId: string | null;
  relationId: string | null;
  budgetId: string | null;
  interestIds: string[];
  locale: Locale;
}

export type CriteriaStatus =
  | { status: "ready"; missingInterests: 0; missingStep: null }
  | { status: "unchanged"; missingInterests: 0; missingStep: null }
  | { status: "incomplete"; missingInterests: number; missingStep: 1 | 2 | 3 | 4 };

export const emptyDraft = (locale: Locale): Draft => ({
  occasionId: null,
  relationId: null,
  budgetId: null,
  interestIds: [],
  locale,
});

/** Critères complets issus d'un brouillon, ou `null` s'il n'est pas valide. */
export function toCriteria(draft: Draft): Criteria | null {
  const parsed = CriteriaSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
}

/**
 * Statut du bouton de génération : `incomplete` (étape vide ou moins de 5 centres d'intérêt),
 * `unchanged` (identique à l'un des critères de référence, par exemple ceux de la sélection
 * affichée), sinon `ready`. `incomplete` l'emporte sur `unchanged`.
 */
export function getCriteriaStatus(draft: Draft, referenceCriteria: (Criteria | null | undefined)[] = []): CriteriaStatus {
  if (!draft.occasionId || !OCCASION_IDS.has(draft.occasionId)) return { status: "incomplete", missingInterests: missing(draft), missingStep: 1 };
  if (!draft.relationId || !RELATION_IDS.has(draft.relationId)) return { status: "incomplete", missingInterests: missing(draft), missingStep: 2 };
  if (!draft.budgetId || !BUDGET_IDS.has(draft.budgetId)) return { status: "incomplete", missingInterests: missing(draft), missingStep: 3 };

  const criteria = toCriteria(draft);
  if (!criteria) return { status: "incomplete", missingInterests: missing(draft), missingStep: 4 };

  if (referenceCriteria.some((ref) => ref && criteriaEqual(criteria, ref))) {
    return { status: "unchanged", missingInterests: 0, missingStep: null };
  }
  return { status: "ready", missingInterests: 0, missingStep: null };
}

function missing(draft: Draft): number {
  const valid = new Set(draft.interestIds.filter((id) => INTEREST_IDS.has(id)));
  return Math.max(0, MIN_INTERESTS - valid.size);
}

/** Même occasion, relation, budget, langue et même ensemble de centres d'intérêt. */
export function criteriaEqual(a: Criteria, b: Criteria): boolean {
  if (a.occasionId !== b.occasionId || a.relationId !== b.relationId || a.budgetId !== b.budgetId || a.locale !== b.locale) {
    return false;
  }
  if (a.interestIds.length !== b.interestIds.length) return false;
  const set = new Set(a.interestIds);
  return b.interestIds.every((id) => set.has(id));
}
