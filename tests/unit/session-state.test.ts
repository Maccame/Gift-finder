import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadState, saveState, STORAGE_KEY, type SessionState } from "@/lib/session-state";

const STATE: SessionState = {
  step: 4,
  draft: { occasionId: "birthday", relationId: "friend", budgetId: "50_100", interestIds: ["musician"], locale: "fr" },
  selection: null,
};

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
}

describe("session-state (FR-029)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: fakeStorage() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("aller-retour dans sessionStorage sous la clé gift-finder:v1", () => {
    saveState(STATE);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(loadState()).toEqual(STATE);
  });

  it("conserve une sélection valide", () => {
    const selection = {
      criteria: { ...STATE.draft, interestIds: ["musician", "gamer", "flowers", "cooking", "hiking"] } as SessionState["draft"] & { occasionId: string; relationId: string; budgetId: string },
      ideas: [{ rank: 1, title: "t", description: "d", priceEur: 60, matchedInterestIds: ["musician"], links: [] }],
      affiliateDisclosure: false,
    };
    saveState({ ...STATE, selection });
    expect(loadState()?.selection).toEqual(selection);
  });

  it("état absent → null", () => {
    expect(loadState()).toBeNull();
  });

  it.each([
    ["JSON illisible", "{oups"],
    ["étape hors bornes", JSON.stringify({ ...STATE, step: 7 })],
    ["brouillon mal formé", JSON.stringify({ ...STATE, draft: { ...STATE.draft, interestIds: "x" } })],
    ["langue inconnue", JSON.stringify({ ...STATE, draft: { ...STATE.draft, locale: "it" } })],
    ["sélection mal formée", JSON.stringify({ ...STATE, selection: { ideas: [] } })],
  ])("%s → null", (_name, raw) => {
    window.sessionStorage.setItem(STORAGE_KEY, raw);
    expect(loadState()).toBeNull();
  });

  it("stockage indisponible : aucune exception", () => {
    vi.stubGlobal("window", {
      get sessionStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(() => saveState(STATE)).not.toThrow();
    expect(loadState()).toBeNull();
  });
});
