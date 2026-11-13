import { describe, expect, it, vi } from "vitest";
import { handleSuggestions, type SuggestionsDeps } from "@/pages/api/suggestions";
import type { GenerateResult } from "@/lib/generation/claude";
import type { QuotaStore } from "@/lib/quota";
import { CRITERIA, fixtureOutput } from "./helpers";

const NOW = new Date("2026-11-11T10:00:00Z");

/** Compteurs simulés : `full` choisit le quota atteint. */
function fakeStore(full: "none" | "daily" | "monthly" = "none") {
  const store: QuotaStore = {
    runBatch: vi.fn(async () => (full === "none" ? 2 : 0)),
    getCounts: vi.fn(async (keys: string[]) =>
      Object.fromEntries(
        keys.map((k) => [k, k.startsWith("day:") ? (full === "daily" ? 30 : 0) : full === "monthly" ? 700 : 0]),
      ),
    ),
  };
  return store;
}

function deps(over: Partial<SuggestionsDeps> = {}, result: GenerateResult = { kind: "ok", raw: fixtureOutput("nominal-fr") }) {
  return {
    store: fakeStore(),
    limits: { daily: 30, monthly: 700 },
    generate: vi.fn(async () => result),
    now: () => NOW,
    ...over,
  } satisfies SuggestionsDeps;
}

const post = (body: unknown) =>
  new Request("http://localhost/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

async function expectCommonHeaders(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("Set-Cookie")).toBeNull();
  expect(response.headers.get("Content-Type")).toContain("application/json");
}

describe("POST /api/suggestions : requête invalide → 400 sans réservation", () => {
  it.each([
    ["4 centres d'intérêt", { ...CRITERIA, interestIds: CRITERIA.interestIds.slice(0, 4) }],
    ["id inconnu", { ...CRITERIA, interestIds: [...CRITERIA.interestIds.slice(0, 4), "nope"] }],
    ["doublon", { ...CRITERIA, interestIds: [...CRITERIA.interestIds.slice(0, 4), "gamer"] }],
    ["champ inconnu", { ...CRITERIA, freeText: "salut" }],
    ["JSON invalide", "{pas du json"],
  ])("%s", async (_name, body) => {
    const d = deps();
    const response = await handleSuggestions(post(body), d);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_criteria" });
    expect(d.store.runBatch).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
    await expectCommonHeaders(response);
  });
});

describe("POST /api/suggestions : quota", () => {
  it("quota journalier atteint → 429 quota_reached, modèle non appelé", async () => {
    const d = deps({ store: fakeStore("daily") });
    const response = await handleSuggestions(post(CRITERIA), d);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "quota_reached", availableAgainAt: "2026-11-11T23:00:00.000Z" });
    expect(d.generate).not.toHaveBeenCalled();
    await expectCommonHeaders(response);
  });

  it("quota mensuel atteint → date du 1er du mois suivant", async () => {
    const response = await handleSuggestions(post(CRITERIA), deps({ store: fakeStore("monthly") }));
    expect(await response.json()).toEqual({ error: "quota_reached", availableAgainAt: "2026-11-30T23:00:00.000Z" });
  });
});

describe("POST /api/suggestions : génération", () => {
  it("nominal-fr → 200 au format du contrat", async () => {
    const d = deps();
    const response = await handleSuggestions(post(CRITERIA), d);
    expect(response.status).toBe(200);
    await expectCommonHeaders(response);
    const body = (await response.json()) as { ideas: Record<string, unknown>[]; affiliateDisclosure: boolean };
    expect(Object.keys(body).sort()).toEqual(["affiliateDisclosure", "ideas"]);
    expect(body.ideas).toHaveLength(6);
    expect(body.ideas.map((i) => i.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const idea of body.ideas) {
      expect(Object.keys(idea).sort()).toEqual(["description", "links", "matchedInterestIds", "priceEur", "rank", "title"]);
    }
    expect(d.store.runBatch).toHaveBeenCalledTimes(1);
    expect(d.generate).toHaveBeenCalledWith(CRITERIA);
  });

  it("refusal → 422 no_valid_idea", async () => {
    const response = await handleSuggestions(post(CRITERIA), deps({}, { kind: "refusal" }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "no_valid_idea" });
  });

  it("aucune idée valide → 422 no_valid_idea", async () => {
    const raw = fixtureOutput("nominal-fr");
    raw.ideas = raw.ideas.map((i: { priceEur: number }) => ({ ...i, priceEur: 5 }));
    const response = await handleSuggestions(post(CRITERIA), deps({}, { kind: "ok", raw }));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "no_valid_idea" });
  });

  it("truncated → 502 generation_failed", async () => {
    const response = await handleSuggestions(post(CRITERIA), deps({}, { kind: "failed" }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "generation_failed" });
    await expectCommonHeaders(response);
  });

  it("délai → 504 generation_timeout", async () => {
    const response = await handleSuggestions(post(CRITERIA), deps({}, { kind: "timeout" }));
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: "generation_timeout" });
  });

  it("une génération qui lève une exception → 502", async () => {
    const d = deps({ generate: vi.fn(async () => { throw new Error("x"); }) });
    const response = await handleSuggestions(post(CRITERIA), d);
    expect(response.status).toBe(502);
  });
});
