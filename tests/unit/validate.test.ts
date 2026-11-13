import { describe, expect, it } from "vitest";
import { validateIdeas } from "@/lib/generation/validate";
import type { LlmOutput } from "@/lib/generation/schema";
import { CRITERIA, fixtureOutput } from "./helpers";

const out = (name: string) => fixtureOutput(name) as LlmOutput;
const base = () => out("nominal-fr").ideas;

describe("validateIdeas (contracts/api.md, étapes 4 et 5)", () => {
  it("nominal-fr : 6 idées de rank 1 à 6 dans l'ordre reçu", () => {
    const ideas = validateIdeas(out("nominal-fr"), CRITERIA);
    expect(ideas.map((i) => i.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ideas.map((i) => i.title)).toEqual(base().map((i) => i.title));
  });

  it("out-of-budget : seules les 4 idées dans la tranche restent (SC-006)", () => {
    const ideas = validateIdeas(out("out-of-budget"), CRITERIA);
    expect(ideas).toHaveLength(4);
    expect(ideas.every((i) => i.priceEur >= 50 && i.priceEur <= 100)).toBe(true);
    expect(ideas.map((i) => i.rank)).toEqual([1, 2, 3, 4]);
  });

  it("duplicates : garde la première des idées de même titre", () => {
    const ideas = validateIdeas(out("duplicates"), CRITERIA);
    expect(ideas).toHaveLength(5);
    expect(ideas[0].title).toBe("Pédale d'effet pour guitare");
    expect(ideas.filter((i) => i.title.toLowerCase().includes("pedale"))).toHaveLength(0);
  });

  it("unknown-interest : écarte l'idée liée à un centre d'intérêt absent des critères", () => {
    const ideas = validateIdeas(out("unknown-interest"), CRITERIA);
    expect(ideas).toHaveLength(5);
    expect(ideas.some((i) => i.matchedInterestIds.includes("tennis"))).toBe(false);
  });

  it("écarte une idée sans centre d'intérêt correspondant", () => {
    const raw = { ideas: [{ ...base()[0], matchedInterestIds: [] }, base()[1]] };
    expect(validateIdeas(raw, CRITERIA)).toHaveLength(1);
  });

  it.each(["http://exemple.fr pédale", "www.exemple.fr", "voir https://x.y"])(
    "écarte un searchQuery contenant une URL : %s",
    (searchQuery) => {
      const raw = { ideas: [{ ...base()[0], searchQuery }, base()[1]] };
      const ideas = validateIdeas(raw, CRITERIA);
      expect(ideas).toHaveLength(1);
      expect(ideas[0].title).toBe(base()[1].title);
    },
  );

  it("écarte un searchQuery vide ou de plus de 80 caractères", () => {
    const raw = { ideas: [{ ...base()[0], searchQuery: " " }, { ...base()[1], searchQuery: "x".repeat(81) }, base()[2]] };
    expect(validateIdeas(raw, CRITERIA)).toHaveLength(1);
  });

  it("écarte un titre vide ou de plus de 80 caractères, une description vide ou de plus de 300", () => {
    const raw = {
      ideas: [
        { ...base()[0], title: "" },
        { ...base()[1], title: "t".repeat(81) },
        { ...base()[2], description: "" },
        { ...base()[3], description: "d".repeat(301) },
        base()[4],
      ],
    };
    const ideas = validateIdeas(raw, CRITERIA);
    expect(ideas.map((i) => i.title)).toEqual([base()[4].title]);
  });

  it("au-delà de 6 idées, seules les 6 premières sont gardées", () => {
    const extra = { ...base()[0], title: "Septième idée", searchQuery: "septième" };
    const ideas = validateIdeas({ ideas: [...base(), extra] }, CRITERIA);
    expect(ideas).toHaveLength(6);
    expect(ideas.some((i) => i.title === "Septième idée")).toBe(false);
  });

  it("over_200 accepte tout prix ≥ 200 et refuse en dessous", () => {
    const criteria = { ...CRITERIA, budgetId: "over_200" };
    const raw = { ideas: [{ ...base()[0], priceEur: 200 }, { ...base()[1], priceEur: 1500 }, { ...base()[2], priceEur: 199 }] };
    expect(validateIdeas(raw, criteria).map((i) => i.priceEur)).toEqual([200, 1500]);
  });

  it("les bornes de la tranche sont incluses", () => {
    const raw = { ideas: [{ ...base()[0], priceEur: 50 }, { ...base()[1], priceEur: 100 }, { ...base()[2], priceEur: 100.5 }] };
    expect(validateIdeas(raw, CRITERIA).map((i) => i.priceEur)).toEqual([50, 100]);
  });

  it("long-description : la description est réduite à ses 2 premières phrases et l'idée est gardée", () => {
    const ideas = validateIdeas(out("long-description"), CRITERIA);
    expect(ideas).toHaveLength(6);
    expect(ideas[0].description).toBe("Un beau carnet relié pour noter ses recettes. Les pages sont illustrées.");
  });

  it("aucune idée valide → liste vide", () => {
    const raw = { ideas: base().map((i) => ({ ...i, priceEur: 10 })) };
    expect(validateIdeas(raw, CRITERIA)).toEqual([]);
  });
});
