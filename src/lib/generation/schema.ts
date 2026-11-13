// Sortie attendue du modèle (contracts/llm-output.md). Le schéma ne décrit que la structure : les
// longueurs, le budget et les centres d'intérêt sont vérifiés idée par idée dans validate.ts, pour
// écarter une idée fautive sans rejeter toute la réponse.
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";

export const LlmIdeaSchema = z.object({
  title: z.string(),
  description: z.string(),
  priceEur: z.number(),
  matchedInterestIds: z.array(z.string()),
  searchQuery: z.string(),
});

export const LlmOutputSchema = z.object({
  ideas: z.array(LlmIdeaSchema),
});

export type LlmIdea = z.infer<typeof LlmIdeaSchema>;
export type LlmOutput = z.infer<typeof LlmOutputSchema>;

/** Format de `output_config.format` (JSON Schema adapté par le SDK aux contraintes de l'API). */
export const llmOutputFormat = betaZodOutputFormat(LlmOutputSchema);
