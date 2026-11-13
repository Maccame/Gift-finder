import { describe, expect, it } from "vitest";
import { CriteriaSchema, criteriaEqual, getCriteriaStatus, MAX_INTERESTS, MIN_INTERESTS, type Draft } from "@/lib/criteria";
import type { Criteria } from "@/lib/types";

const FIVE = ["musician", "gamer", "flowers", "cooking", "hiking"];
const TEN = [...FIVE, "museums", "guitar", "piano", "chess", "yoga"];

const draft = (over: Partial<Draft> = {}): Draft => ({
  occasionId: "birthday",
  relationId: "friend",
  budgetId: "50_100",
  interestIds: FIVE,
  locale: "fr",
  ...over,
});

describe("bornes", () => {
  it("5 à 10 centres d'intérêt", () => {
    expect(MIN_INTERESTS).toBe(5);
    expect(MAX_INTERESTS).toBe(10);
  });
});

describe("getCriteriaStatus (FR-010)", () => {
  it.each([0, 1, 2, 3, 4])("%i centre(s) d'intérêt choisi(s) → incomplete, il en manque 5 - n", (n) => {
    const status = getCriteriaStatus(draft({ interestIds: FIVE.slice(0, n) }));
    expect(status).toEqual({ status: "incomplete", missingInterests: 5 - n, missingStep: 4 });
  });

  it("indique la première étape vide", () => {
    expect(getCriteriaStatus(draft({ occasionId: null })).missingStep).toBe(1);
    expect(getCriteriaStatus(draft({ relationId: null })).missingStep).toBe(2);
    expect(getCriteriaStatus(draft({ budgetId: null })).missingStep).toBe(3);
    expect(getCriteriaStatus(draft({ occasionId: null })).status).toBe("incomplete");
  });

  it.each([5, 7, 10])("%i centres d'intérêt valides → ready", (n) => {
    expect(getCriteriaStatus(draft({ interestIds: TEN.slice(0, n) }))).toEqual({
      status: "ready",
      missingInterests: 0,
      missingStep: null,
    });
  });

  it("refuse plus de 10 centres d'intérêt", () => {
    expect(getCriteriaStatus(draft({ interestIds: [...TEN, "tennis"] })).status).toBe("incomplete");
  });

  it("refuse les doublons et les id inconnus", () => {
    expect(getCriteriaStatus(draft({ interestIds: [...FIVE.slice(0, 4), "musician"] })).status).toBe("incomplete");
    expect(getCriteriaStatus(draft({ interestIds: [...FIVE.slice(0, 4), "unknown_thing"] })).status).toBe("incomplete");
  });

  it("refuse une occasion, une relation ou un budget inconnus", () => {
    expect(getCriteriaStatus(draft({ occasionId: "nope" })).status).toBe("incomplete");
    expect(getCriteriaStatus(draft({ budgetId: "nope" })).status).toBe("incomplete");
  });
});

describe("CriteriaSchema", () => {
  const valid: Criteria = { locale: "fr", occasionId: "birthday", relationId: "friend", budgetId: "50_100", interestIds: FIVE };

  it("accepte des critères valides", () => {
    expect(CriteriaSchema.safeParse(valid).success).toBe(true);
  });

  it("refuse tout champ inconnu", () => {
    expect(CriteriaSchema.safeParse({ ...valid, freeText: "bonjour" }).success).toBe(false);
  });

  it("refuse 4 centres d'intérêt, 11, un doublon ou un id inconnu", () => {
    expect(CriteriaSchema.safeParse({ ...valid, interestIds: FIVE.slice(0, 4) }).success).toBe(false);
    expect(CriteriaSchema.safeParse({ ...valid, interestIds: [...TEN, "tennis"] }).success).toBe(false);
    expect(CriteriaSchema.safeParse({ ...valid, interestIds: [...FIVE.slice(0, 4), "gamer"] }).success).toBe(false);
    expect(CriteriaSchema.safeParse({ ...valid, interestIds: [...FIVE.slice(0, 4), "xyz"] }).success).toBe(false);
  });

  it("refuse une langue, une occasion, une relation ou un budget inconnus", () => {
    expect(CriteriaSchema.safeParse({ ...valid, locale: "it" }).success).toBe(false);
    expect(CriteriaSchema.safeParse({ ...valid, occasionId: "x" }).success).toBe(false);
    expect(CriteriaSchema.safeParse({ ...valid, relationId: "x" }).success).toBe(false);
    expect(CriteriaSchema.safeParse({ ...valid, budgetId: "x" }).success).toBe(false);
  });
});

describe("criteriaEqual", () => {
  const a: Criteria = { locale: "fr", occasionId: "birthday", relationId: "friend", budgetId: "50_100", interestIds: FIVE };

  it("ignore l'ordre des centres d'intérêt", () => {
    expect(criteriaEqual(a, { ...a, interestIds: [...FIVE].reverse() })).toBe(true);
  });

  it("distingue chaque critère et la langue", () => {
    expect(criteriaEqual(a, { ...a, budgetId: "20_50" })).toBe(false);
    expect(criteriaEqual(a, { ...a, locale: "en" })).toBe(false);
    expect(criteriaEqual(a, { ...a, interestIds: [...FIVE.slice(0, 4), "chess"] })).toBe(false);
  });
});

describe("getCriteriaStatus avec critères de référence (US2, FR-018)", () => {
  const shown: Criteria = { locale: "fr", occasionId: "birthday", relationId: "friend", budgetId: "50_100", interestIds: FIVE };

  it("unchanged quand le brouillon est égal aux critères affichés, quel que soit l'ordre", () => {
    expect(getCriteriaStatus(draft(), [shown]).status).toBe("unchanged");
    expect(getCriteriaStatus(draft({ interestIds: [...FIVE].reverse() }), [shown]).status).toBe("unchanged");
  });

  it("ready dès qu'un critère ou la langue diffère", () => {
    expect(getCriteriaStatus(draft({ budgetId: "20_50" }), [shown]).status).toBe("ready");
    expect(getCriteriaStatus(draft({ locale: "en" }), [shown]).status).toBe("ready");
    expect(getCriteriaStatus(draft({ interestIds: [...FIVE, "chess"] }), [shown]).status).toBe("ready");
  });

  it("incomplete l'emporte sur unchanged sous 5 centres d'intérêt", () => {
    const four = { ...shown, interestIds: FIVE.slice(0, 4) };
    expect(getCriteriaStatus(draft({ interestIds: FIVE.slice(0, 4) }), [four]).status).toBe("incomplete");
  });

  it("unchanged aussi quand le brouillon est égal au deuxième critère de référence", () => {
    const rejected = { ...shown, budgetId: "100_200" };
    expect(getCriteriaStatus(draft({ budgetId: "100_200" }), [shown, rejected]).status).toBe("unchanged");
    expect(getCriteriaStatus(draft({ budgetId: "100_200" }), [null, rejected]).status).toBe("unchanged");
  });
});
