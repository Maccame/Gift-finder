// GET /api/status : état du quota, sans rien réserver (contracts/api.md, FR-024).
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { json } from "@/lib/http";
import { d1QuotaStore, getQuotaStatus, limitsFromEnv, type QuotaLimits, type QuotaStore } from "@/lib/quota";

export const prerender = false;

export interface StatusDeps {
  store: QuotaStore;
  limits: QuotaLimits;
  now?: () => Date;
}

export async function handleStatus({ store, limits, now = () => new Date() }: StatusDeps): Promise<Response> {
  return json(await getQuotaStatus(store, limits, now()));
}

export const GET: APIRoute = () => handleStatus({ store: d1QuotaStore(env.QUOTA_DB), limits: limitsFromEnv(env) });
