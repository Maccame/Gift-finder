import { readFileSync } from "node:fs";
import type { Criteria } from "@/lib/types";

/** Critères des réponses simulées (tests/fixtures/llm). */
export const CRITERIA: Criteria = {
  locale: "fr",
  occasionId: "birthday",
  relationId: "friend",
  budgetId: "50_100",
  interestIds: ["musician", "gamer", "flowers", "cooking", "hiking"],
};

export interface FixtureMessage {
  stop_reason: string;
  content: { type: string; text?: string }[];
}

export function fixture(name: string): FixtureMessage {
  return JSON.parse(readFileSync(new URL(`../fixtures/llm/${name}.json`, import.meta.url), "utf8"));
}

/** Contenu JSON (`{ ideas }`) d'une réponse simulée. */
export function fixtureOutput(name: string) {
  const text = fixture(name).content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text);
}
