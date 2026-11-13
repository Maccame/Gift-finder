// Réponses JSON de l'API (contracts/api.md, règles communes) : `Cache-Control: no-store`, jamais
// de `Set-Cookie` (principe VIII).
import type { ApiError } from "./types";

export function json(body: unknown, status = 200, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.delete("Set-Cookie");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { ...init, status, headers });
}

export function apiError(code: ApiError, status: number, extra?: Record<string, unknown>): Response {
  return json({ error: code, ...extra }, status);
}
