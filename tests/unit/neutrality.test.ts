// Neutralité de l'affiliation (principe VI, SC-010, SC-011).
import { describe, expect, it } from "vitest";
import { validateIdeas } from "@/lib/generation/validate";
import { amazonTagFor, buildLinks, toSelectionBody } from "@/lib/links";
import type { LlmOutput } from "@/lib/generation/schema";
import type { Locale } from "@/lib/types";
import { CRITERIA, fixtureOutput } from "./helpers";

const ALL_TAGS = { AMAZON_TAG_FR: "fr-21", AMAZON_TAG_DE: "de-21", AMAZON_TAG_ES: "es-21", AMAZON_TAG_UK: "uk-21" };
const CASES: [string, Locale][] = [
  ["nominal-fr", "fr"],
  ["nominal-en", "en"],
  ["nominal-es", "es"],
  ["nominal-de", "de"],
  ["out-of-budget", "fr"],
];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe.each(CASES)("%s (%s)", (name, locale) => {
  const ranked = validateIdeas(fixtureOutput(name) as LlmOutput, { ...CRITERIA, locale });
  const withTags = toSelectionBody(ranked, locale, amazonTagFor(ALL_TAGS, locale));
  const without = toSelectionBody(ranked, locale, amazonTagFor({}, locale));

  it("titres et rangs strictement identiques avec et sans les tags", () => {
    expect(withTags.ideas.map((i) => [i.rank, i.title])).toEqual(without.ideas.map((i) => [i.rank, i.title]));
  });

  it("au plus 2 liens affiliés par sélection", () => {
    const count = withTags.ideas.flatMap((i) => i.links).filter((l) => l.affiliate).length;
    expect(count).toBeLessThanOrEqual(2);
    expect(count).toBe(Math.min(2, ranked.length));
  });

  it("affiliateDisclosure vaut true si et seulement si un lien est affilié", () => {
    expect(withTags.affiliateDisclosure).toBe(true);
    expect(without.affiliateDisclosure).toBe(false);
    expect(without.ideas.flatMap((i) => i.links).some((l) => l.affiliate)).toBe(false);
  });

  it("buildLinks ne modifie pas le tableau reçu", () => {
    const frozen = deepFreeze(structuredClone(ranked));
    const copy = structuredClone(frozen);
    const built = buildLinks(frozen, locale, "x-21");
    expect(frozen).toEqual(copy);
    expect(built).not.toBe(frozen);
  });

  it("searchQuery n'est pas renvoyé au navigateur", () => {
    for (const idea of withTags.ideas) expect(idea).not.toHaveProperty("searchQuery");
  });
});
