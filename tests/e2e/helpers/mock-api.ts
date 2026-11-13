// Interception de /api/status et /api/suggestions : aucun test e2e n'appelle l'API payante ni D1.
import { readFileSync } from "node:fs";
import type { Page, Route } from "@playwright/test";

type Locale = "fr" | "en" | "es" | "de";

export interface MockResponse {
  status: number;
  body: unknown;
  /** Délai avant la réponse, en millisecondes. */
  delayMs?: number;
}

interface FixtureIdea {
  title: string;
  description: string;
  priceEur: number;
  matchedInterestIds: string[];
  searchQuery: string;
}

const AMAZON: Record<Locale, string> = {
  fr: "www.amazon.fr",
  de: "www.amazon.de",
  es: "www.amazon.es",
  en: "www.amazon.co.uk",
};

function fixtureIdeas(name: string): FixtureIdea[] {
  const message = JSON.parse(readFileSync(new URL(`../../fixtures/llm/${name}.json`, import.meta.url), "utf8"));
  const text = message.content.find((b: { type: string }) => b.type === "text").text;
  return JSON.parse(text).ideas;
}

/** Corps 200 de /api/suggestions construit à partir d'une réponse simulée du modèle. */
export function selectionBody(locale: Locale = "fr", options: { affiliate?: boolean; fixture?: string } = {}) {
  const ideas = fixtureIdeas(options.fixture ?? `nominal-${locale}`).map((idea, index) => {
    const q = new URLSearchParams({ k: idea.searchQuery });
    const affiliate = Boolean(options.affiliate) && index < 2;
    if (affiliate) q.set("tag", "test-21");
    return {
      rank: index + 1,
      title: idea.title,
      description: idea.description,
      priceEur: idea.priceEur,
      matchedInterestIds: idea.matchedInterestIds,
      links: [
        { merchant: "amazon", url: `https://${AMAZON[locale]}/s?${q}`, affiliate },
        { merchant: "etsy", url: `https://www.etsy.com/search?${new URLSearchParams({ q: idea.searchQuery })}`, affiliate: false },
      ],
    };
  });
  return { ideas, affiliateDisclosure: Boolean(options.affiliate) };
}

export const errors = {
  quota: { status: 429, body: { error: "quota_reached", availableAgainAt: "2026-11-11T23:00:00.000Z" } },
  rateLimited: { status: 429, body: { error: "rate_limited" } },
  noValidIdea: { status: 422, body: { error: "no_valid_idea" } },
  failed: { status: 502, body: { error: "generation_failed" } },
  timeout: { status: 504, body: { error: "generation_timeout" } },
} satisfies Record<string, MockResponse>;

export interface ApiMock {
  /** Nombre de requêtes reçues par /api/suggestions. */
  suggestionsCount(): number;
  /** Corps JSON des requêtes reçues par /api/suggestions. */
  suggestionsRequests(): unknown[];
  /** Réponse des prochaines requêtes (la dernière fournie reste active). */
  respondWith(...responses: MockResponse[]): void;
  setStatus(response: MockResponse): void;
}

export async function mockApi(
  page: Page,
  options: { status?: MockResponse; suggestions?: MockResponse[] } = {},
): Promise<ApiMock> {
  let statusResponse: MockResponse = options.status ?? {
    status: 200,
    body: { generation: "available", availableAgainAt: null },
  };
  let queue: MockResponse[] = options.suggestions ?? [{ status: 200, body: selectionBody("fr") }];
  const requests: unknown[] = [];

  const fulfil = async (route: Route, response: MockResponse) => {
    if (response.delayMs) await new Promise((r) => setTimeout(r, response.delayMs));
    await route
      .fulfill({
        status: response.status,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify(response.body),
      })
      .catch(() => {});
  };

  await page.route("**/api/status", (route) => fulfil(route, statusResponse));
  await page.route("**/api/suggestions", (route) => {
    requests.push(route.request().postDataJSON());
    const response = queue.length > 1 ? queue.shift()! : queue[0];
    return fulfil(route, response);
  });

  return {
    suggestionsCount: () => requests.length,
    suggestionsRequests: () => requests,
    respondWith: (...responses) => {
      queue = responses;
    },
    setStatus: (response) => {
      statusResponse = response;
    },
  };
}
