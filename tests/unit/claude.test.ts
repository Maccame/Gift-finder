import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { buildRequest, CLIENT_OPTIONS, generateIdeas, type ClaudeClient } from "@/lib/generation/claude";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/generation/prompt";
import { CRITERIA, fixture, fixtureOutput } from "./helpers";

/** Client SDK simulé : aucun appel réseau. */
function mockClient(impl: () => Promise<unknown>) {
  const create = vi.fn(impl);
  return { client: { beta: { messages: { create } } } as unknown as ClaudeClient, create };
}

describe("paramètres de l'appel (contracts/llm-output.md)", () => {
  it("client sans nouvelle tentative et abandon à 20 s", () => {
    expect(CLIENT_OPTIONS).toEqual({ maxRetries: 0, timeout: 20_000 });
  });

  it("modèle, max_tokens, effort, format, repli serveur et messages", () => {
    const request = buildRequest(CRITERIA);
    expect(request.model).toBe("claude-sonnet-5-5");
    expect(request.max_tokens).toBe(4000);
    expect(request.output_config?.effort).toBe("low");
    expect(request.output_config?.format?.type).toBe("json_schema");
    expect(request.output_config?.format?.schema).toBeTruthy();
    expect(request.fallbacks).toBe("default");
    expect(request.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(request.system).toBe(SYSTEM_PROMPT);
    expect(request.messages).toEqual([{ role: "user", content: buildUserMessage(CRITERIA) }]);
    expect(request.stream).toBeFalsy();
  });

  it("le schéma envoyé décrit ideas[] avec les 5 champs attendus", () => {
    const schema = buildRequest(CRITERIA).output_config?.format?.schema as {
      properties: { ideas: { items: { properties: Record<string, unknown>; required: string[] } } };
    };
    const item = schema.properties.ideas.items;
    expect(Object.keys(item.properties).sort()).toEqual(["description", "matchedInterestIds", "priceEur", "searchQuery", "title"]);
    expect(item.required.sort()).toEqual(["description", "matchedInterestIds", "priceEur", "searchQuery", "title"]);
  });
});

describe("generateIdeas", () => {
  it("nominal-fr → ok avec la sortie analysée", async () => {
    const { client, create } = mockClient(async () => fixture("nominal-fr"));
    const result = await generateIdeas(CRITERIA, { apiKey: "test", client });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toEqual(buildRequest(CRITERIA));
    expect(result).toEqual({ kind: "ok", raw: fixtureOutput("nominal-fr") });
  });

  it("garde le dernier bloc de texte après un bloc de repli", async () => {
    const message = fixture("nominal-en");
    const withFallback = { ...message, content: [{ type: "fallback" }, ...message.content] };
    const { client } = mockClient(async () => withFallback);
    expect(await generateIdeas(CRITERIA, { apiKey: "test", client })).toEqual({ kind: "ok", raw: fixtureOutput("nominal-en") });
  });

  it("refusal → refusal", async () => {
    const { client } = mockClient(async () => fixture("refusal"));
    expect(await generateIdeas(CRITERIA, { apiKey: "test", client })).toEqual({ kind: "refusal" });
  });

  it("truncated (max_tokens) → failed", async () => {
    const { client } = mockClient(async () => fixture("truncated"));
    expect(await generateIdeas(CRITERIA, { apiKey: "test", client })).toEqual({ kind: "failed" });
  });

  it("JSON invalide ou hors schéma → failed", async () => {
    const bad = { stop_reason: "end_turn", content: [{ type: "text", text: "pas du JSON" }] };
    expect(await generateIdeas(CRITERIA, { apiKey: "test", client: mockClient(async () => bad).client })).toEqual({ kind: "failed" });
    const wrongShape = { stop_reason: "end_turn", content: [{ type: "text", text: '{"ideas":"non"}' }] };
    expect(await generateIdeas(CRITERIA, { apiKey: "test", client: mockClient(async () => wrongShape).client })).toEqual({
      kind: "failed",
    });
  });

  it.each([
    ["5xx", () => new Anthropic.InternalServerError(500, { type: "error" }, "boom", new Headers())],
    ["429", () => new Anthropic.RateLimitError(429, { type: "error" }, "slow down", new Headers())],
    ["réseau", () => new Anthropic.APIConnectionError({ message: "offline" })],
  ])("erreur du fournisseur (%s) → failed", async (_name, makeError) => {
    const { client } = mockClient(async () => {
      throw makeError();
    });
    expect(await generateIdeas(CRITERIA, { apiKey: "test", client })).toEqual({ kind: "failed" });
  });

  it("erreur de délai du SDK → timeout", async () => {
    const { client } = mockClient(async () => {
      throw new Anthropic.APIConnectionTimeoutError({ message: "timeout" });
    });
    expect(await generateIdeas(CRITERIA, { apiKey: "test", client })).toEqual({ kind: "timeout" });
  });

  it("ne journalise ni les critères ni la réponse", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await generateIdeas(CRITERIA, { apiKey: "test", client: mockClient(async () => fixture("nominal-fr")).client });
    await generateIdeas(CRITERIA, { apiKey: "test", client: mockClient(async () => { throw new Error("x"); }).client });
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});
