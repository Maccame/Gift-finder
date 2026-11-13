// Validation des idées et ordre figé (contracts/api.md, étapes 4 et 5 ; data-model §4).
import budgets from "@/data/budgets.json";
import { normalize } from "@/lib/interests-search";
import type { Criteria } from "@/lib/types";
import type { LlmOutput } from "./schema";

export const MAX_IDEAS = 6;

/** Idée validée et classée, avant l'ajout des liens. `searchQuery` ne part pas au navigateur. */
export interface RankedIdea {
  rank: number;
  title: string;
  description: string;
  priceEur: number;
  matchedInterestIds: string[];
  searchQuery: string;
}

const URL_PATTERN = /https?:|www\.|:\/\//i;

/** Garde les 2 premières phrases (fin sur `.`, `!`, `?` ou `…` suivie d'une espace ou de la fin). */
export function firstTwoSentences(text: string): string {
  const trimmed = text.trim();
  const sentences = trimmed.match(/[^.!?…]*[.!?…]+(?=\s|$)|[^.!?…]+$/g);
  if (!sentences || sentences.length <= 2) return trimmed;
  return sentences.slice(0, 2).join("").trim();
}

export function validateIdeas(raw: LlmOutput, criteria: Criteria): RankedIdea[] {
  const budget = budgets.find((b) => b.id === criteria.budgetId);
  if (!budget) return [];
  const allowed = new Set(criteria.interestIds);
  const seenTitles = new Set<string>();
  const kept: Omit<RankedIdea, "rank">[] = [];

  for (const idea of raw.ideas) {
    if (kept.length === MAX_IDEAS) break;

    const title = idea.title.trim();
    const description = firstTwoSentences(idea.description);
    const searchQuery = idea.searchQuery.trim();
    const price = idea.priceEur;

    if (title.length < 1 || title.length > 80) continue;
    if (description.length < 1 || description.length > 300) continue;
    if (!Number.isFinite(price) || price < budget.minEur || (budget.maxEur !== null && price > budget.maxEur)) continue;
    if (idea.matchedInterestIds.length === 0 || !idea.matchedInterestIds.every((id) => allowed.has(id))) continue;
    if (searchQuery.length < 1 || searchQuery.length > 80 || URL_PATTERN.test(searchQuery)) continue;

    const key = normalize(title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);

    kept.push({ title, description, priceEur: price, matchedInterestIds: [...new Set(idea.matchedInterestIds)], searchQuery });
  }

  // Ordre figé : celui de la réponse validée, numéroté de 1 à n.
  return kept.map((idea, index) => ({ rank: index + 1, ...idea }));
}
