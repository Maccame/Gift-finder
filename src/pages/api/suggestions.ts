// POST /api/suggestions : traitement dans l'ordre de contracts/api.md.
// Aucune journalisation des critères ni des réponses (principe VIII).
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { CriteriaSchema } from "@/lib/criteria";
import { generateIdeas, type GenerateResult } from "@/lib/generation/claude";
import { validateIdeas } from "@/lib/generation/validate";
import { apiError, json } from "@/lib/http";
import { d1QuotaStore, limitsFromEnv, reserve, type QuotaLimits, type QuotaStore } from "@/lib/quota";
import type { Criteria, GiftIdea } from "@/lib/types";

export const prerender = false;

export interface SuggestionsDeps {
  store: QuotaStore;
  limits: QuotaLimits;
  generate: (criteria: Criteria) => Promise<GenerateResult>;
  now?: () => Date;
}

export async function handleSuggestions(request: Request, deps: SuggestionsDeps): Promise<Response> {
  // 1. Valider la requête.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_criteria", 400);
  }
  const parsed = CriteriaSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_criteria", 400);
  const criteria = parsed.data;

  // 2. Réserver une recherche dans les compteurs de quota.
  const reservation = await reserve(deps.store, deps.limits, (deps.now ?? (() => new Date()))());
  if (!reservation.ok) return apiError("quota_reached", 429, { availableAgainAt: reservation.availableAgainAt });

  // 3. Appeler le modèle (abandon à 20 s dans le client).
  let result: GenerateResult;
  try {
    result = await deps.generate(criteria);
  } catch {
    result = { kind: "failed" };
  }
  if (result.kind === "refusal") return apiError("no_valid_idea", 422);
  if (result.kind === "timeout") return apiError("generation_timeout", 504);
  if (result.kind === "failed") return apiError("generation_failed", 502);

  // 4 et 5. Valider les idées et figer leur ordre.
  const ranked = validateIdeas(result.raw, criteria);
  if (ranked.length === 0) return apiError("no_valid_idea", 422);

  // Liens d'achat : ajoutés par US3 (T063). En attendant, `links` est vide.
  const ideas: GiftIdea[] = ranked.map(({ searchQuery: _searchQuery, ...idea }) => ({ ...idea, links: [] }));
  return json({ ideas, affiliateDisclosure: false });
}

export const POST: APIRoute = ({ request }) =>
  handleSuggestions(request, {
    store: d1QuotaStore(env.QUOTA_DB),
    limits: limitsFromEnv(env),
    generate: (criteria) => generateIdeas(criteria, { apiKey: env.ANTHROPIC_API_KEY }),
  });
