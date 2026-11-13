import { describe, expect, it } from "vitest";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/generation/prompt";
import { CRITERIA } from "./helpers";

describe("buildUserMessage (contracts/llm-output.md, FR-030)", () => {
  it("produit exactement le JSON du contrat, avec les libellés dans la langue", () => {
    expect(JSON.parse(buildUserMessage(CRITERIA))).toEqual({
      language: "fr",
      occasion: "Anniversaire",
      relation: "Ami",
      budget: { minEur: 50, maxEur: 100 },
      interests: [
        { id: "musician", label: "Musicien" },
        { id: "gamer", label: "Gamer" },
        { id: "flowers", label: "Aime les fleurs" },
        { id: "cooking", label: "Cuisine" },
        { id: "hiking", label: "Randonnée" },
      ],
    });
  });

  it("utilise la langue des critères et maxEur null pour over_200", () => {
    const message = JSON.parse(buildUserMessage({ ...CRITERIA, locale: "de", budgetId: "over_200" }));
    expect(message.language).toBe("de");
    expect(message.occasion).toBe("Geburtstag");
    expect(message.budget).toEqual({ minEur: 200, maxEur: null });
    expect(message.interests[0]).toEqual({ id: "musician", label: "Musiker" });
  });

  it("ne transmet aucun champ hors critères", () => {
    const withExtra = { ...CRITERIA, ip: "203.0.113.1", userAgent: "x" } as typeof CRITERIA;
    expect(Object.keys(JSON.parse(buildUserMessage(withExtra))).sort()).toEqual(
      ["budget", "interests", "language", "occasion", "relation"],
    );
    expect(buildUserMessage(withExtra)).not.toContain("203.0.113.1");
  });
});

describe("SYSTEM_PROMPT (principe VI)", () => {
  it.each(["amazon", "etsy", "affili", "http"])("ne mentionne pas « %s »", (word) => {
    expect(SYSTEM_PROMPT.toLowerCase()).not.toContain(word);
  });

  it("demande 6 idées, des prix en euros et aucune URL", () => {
    expect(SYSTEM_PROMPT).toMatch(/6/);
    expect(SYSTEM_PROMPT.toLowerCase()).toMatch(/euro/);
  });
});
