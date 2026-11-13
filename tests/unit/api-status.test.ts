import { describe, expect, it, vi } from "vitest";
import { handleStatus } from "@/pages/api/status";
import type { QuotaStore } from "@/lib/quota";

const NOW = new Date("2026-11-11T10:00:00Z");
const LIMITS = { daily: 30, monthly: 700 };

function store(day: number, month: number): QuotaStore {
  return {
    runBatch: vi.fn(async () => 2),
    getCounts: vi.fn(async (keys: string[]) => Object.fromEntries(keys.map((k) => [k, k.startsWith("day:") ? day : month]))),
  };
}

describe("GET /api/status", () => {
  it("available et availableAgainAt null sous les quotas", async () => {
    const s = store(29, 699);
    const response = await handleStatus({ store: s, limits: LIMITS, now: () => NOW });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ generation: "available", availableAgainAt: null });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("limited avec minuit du lendemain quand le quota journalier est atteint", async () => {
    const response = await handleStatus({ store: store(30, 100), limits: LIMITS, now: () => NOW });
    expect(await response.json()).toEqual({ generation: "limited", availableAgainAt: "2026-11-11T23:00:00.000Z" });
  });

  it("limited avec le 1er du mois suivant quand le quota mensuel est atteint", async () => {
    const response = await handleStatus({ store: store(30, 700), limits: LIMITS, now: () => NOW });
    expect(await response.json()).toEqual({ generation: "limited", availableAgainAt: "2026-11-30T23:00:00.000Z" });
  });

  it("ne consomme aucune réservation", async () => {
    const s = store(0, 0);
    await handleStatus({ store: s, limits: LIMITS, now: () => NOW });
    expect(s.runBatch).not.toHaveBeenCalled();
  });
});
