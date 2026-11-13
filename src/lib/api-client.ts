// Appels du navigateur vers l'API du site (contracts/api.md), sans cookie (`credentials: "omit"`).
import type { ApiError, Criteria, Selection } from "./types";

/** Au-delà de 25 s côté navigateur, la demande est traitée comme un délai dépassé. */
export const CLIENT_TIMEOUT_MS = 25_000;

export interface QuotaStatusResponse {
  generation: "available" | "limited";
  availableAgainAt: string | null;
}

export type SuggestionsResult =
  | { ok: true; selection: Selection }
  | { ok: false; error: ApiError; availableAgainAt?: string };

const API_ERRORS: readonly ApiError[] = [
  "invalid_criteria",
  "no_valid_idea",
  "quota_reached",
  "rate_limited",
  "generation_failed",
  "generation_timeout",
];

export async function fetchStatus(): Promise<QuotaStatusResponse | null> {
  try {
    const response = await fetch("/api/status", { credentials: "omit", cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as QuotaStatusResponse;
    return body.generation === "limited" || body.generation === "available" ? body : null;
  } catch {
    return null;
  }
}

export async function requestSuggestions(criteria: Criteria): Promise<SuggestionsResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(criteria),
      signal: controller.signal,
    });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (response.ok && body && Array.isArray(body.ideas)) {
      return {
        ok: true,
        selection: { criteria, ideas: body.ideas as Selection["ideas"], affiliateDisclosure: body.affiliateDisclosure === true },
      };
    }
    const error = API_ERRORS.includes(body?.error as ApiError) ? (body!.error as ApiError) : "generation_failed";
    return typeof body?.availableAgainAt === "string"
      ? { ok: false, error, availableAgainAt: body.availableAgainAt }
      : { ok: false, error };
  } catch (error) {
    return { ok: false, error: controller.signal.aborted ? "generation_timeout" : "generation_failed" };
  } finally {
    clearTimeout(timer);
  }
}
