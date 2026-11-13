// Seul fichier qui parle à l'API payante (contracts/llm-output.md, research R3).
// Ne journalise jamais les critères ni la réponse (principe VIII).
import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Criteria } from "@/lib/types";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { llmOutputFormat, LlmOutputSchema, type LlmOutput } from "./schema";

export const MODEL = "claude-sonnet-5-5";

/** Aucune nouvelle tentative automatique (le visiteur relance) et abandon à 20 s (FR-014). */
export const CLIENT_OPTIONS = { maxRetries: 0, timeout: 20_000 } as const;

export type GenerateResult = { kind: "ok"; raw: LlmOutput } | { kind: "refusal" } | { kind: "failed" } | { kind: "timeout" };

/** Sous-ensemble du client SDK utilisé ici (remplacé par un double en test). */
export type ClaudeClient = Pick<Anthropic, "beta">;

export function buildRequest(criteria: Criteria): MessageCreateParamsNonStreaming {
  return {
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(criteria) }],
    output_config: { effort: "low", format: llmOutputFormat },
    // Repli serveur en cas de refus, sous réserve de son éligibilité à la ZDR (T075).
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  };
}

export function createClient(apiKey: string): ClaudeClient {
  return new Anthropic({ apiKey, ...CLIENT_OPTIONS });
}

export async function generateIdeas(
  criteria: Criteria,
  { apiKey, client }: { apiKey: string; client?: ClaudeClient },
): Promise<GenerateResult> {
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await (client ?? createClient(apiKey)).beta.messages.create(buildRequest(criteria));
  } catch (error) {
    if (error instanceof Anthropic.APIConnectionTimeoutError) return { kind: "timeout" };
    return { kind: "failed" };
  }

  if (message.stop_reason === "refusal") return { kind: "refusal" };
  if (message.stop_reason !== "end_turn") return { kind: "failed" };

  // Après un repli, la réponse peut commencer par un bloc `fallback` : on lit le dernier texte.
  const text = message.content.findLast((block) => block.type === "text");
  if (!text || text.type !== "text") return { kind: "failed" };

  let json: unknown;
  try {
    json = JSON.parse(text.text);
  } catch {
    return { kind: "failed" };
  }
  const parsed = LlmOutputSchema.safeParse(json);
  return parsed.success ? { kind: "ok", raw: parsed.data } : { kind: "failed" };
}
