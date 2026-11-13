import { describe, expect, it } from "vitest";
import { AMAZON_HOSTS, amazonTagFor, buildLinks } from "@/lib/links";
import type { RankedIdea } from "@/lib/generation/validate";

const idea = (rank: number, searchQuery = "pédale delay guitare"): RankedIdea => ({
  rank,
  title: `Idée ${rank}`,
  description: "Une description.",
  priceEur: 60,
  matchedInterestIds: ["musician"],
  searchQuery,
});
const three = [idea(1), idea(2), idea(3, "carnet recettes")];

describe("AMAZON_HOSTS (FR-020)", () => {
  it("un Amazon par langue, Royaume-Uni pour l'anglais", () => {
    expect(AMAZON_HOSTS).toEqual({ fr: "www.amazon.fr", de: "www.amazon.de", es: "www.amazon.es", en: "www.amazon.co.uk" });
  });
});

describe("amazonTagFor", () => {
  const env = { AMAZON_TAG_FR: "fr-21", AMAZON_TAG_DE: "de-21", AMAZON_TAG_ES: "es-21", AMAZON_TAG_UK: "uk-21" };
  it("choisit le tag du pays de la langue (en → UK)", () => {
    expect(amazonTagFor(env, "fr")).toBe("fr-21");
    expect(amazonTagFor(env, "de")).toBe("de-21");
    expect(amazonTagFor(env, "es")).toBe("es-21");
    expect(amazonTagFor(env, "en")).toBe("uk-21");
  });
  it("tag absent ou vide → undefined", () => {
    expect(amazonTagFor({}, "fr")).toBeUndefined();
    expect(amazonTagFor({ AMAZON_TAG_FR: "  " }, "fr")).toBeUndefined();
  });
});

describe("buildLinks", () => {
  it.each([
    ["fr", "https://www.amazon.fr/s?k="],
    ["de", "https://www.amazon.de/s?k="],
    ["es", "https://www.amazon.es/s?k="],
    ["en", "https://www.amazon.co.uk/s?k="],
  ] as const)("%s → %s", (locale, prefix) => {
    const [first] = buildLinks(three, locale, undefined);
    expect(first.links[0].url.startsWith(prefix)).toBe(true);
  });

  it("requête encodée avec URLSearchParams, Etsy compris", () => {
    const [first] = buildLinks(three, "fr", undefined);
    expect(first.links).toEqual([
      { merchant: "amazon", url: "https://www.amazon.fr/s?k=p%C3%A9dale+delay+guitare", affiliate: false },
      { merchant: "etsy", url: "https://www.etsy.com/search?q=p%C3%A9dale+delay+guitare", affiliate: false },
    ]);
  });

  it("exactement 2 liens par idée, Amazon puis Etsy", () => {
    for (const i of buildLinks(three, "fr", "fr-21")) {
      expect(i.links.map((l) => l.merchant)).toEqual(["amazon", "etsy"]);
    }
  });

  it("&tag= seulement sur les liens Amazon des idées de rang 1 et 2", () => {
    const ideas = buildLinks(three, "fr", "fr-21");
    expect(ideas[0].links[0]).toEqual({ merchant: "amazon", url: "https://www.amazon.fr/s?k=p%C3%A9dale+delay+guitare&tag=fr-21", affiliate: true });
    expect(ideas[1].links[0].affiliate).toBe(true);
    expect(ideas[2].links[0]).toEqual({ merchant: "amazon", url: "https://www.amazon.fr/s?k=carnet+recettes", affiliate: false });
    for (const i of ideas) expect(i.links[1].affiliate).toBe(false);
    for (const i of ideas) expect(i.links[1].url).not.toContain("tag=");
  });

  it("aucun tag si le tag est absent ou vide", () => {
    for (const tag of [undefined, "", "   "]) {
      for (const i of buildLinks(three, "fr", tag)) {
        expect(i.links.every((l) => !l.affiliate && !l.url.includes("tag="))).toBe(true);
      }
    }
  });
});
