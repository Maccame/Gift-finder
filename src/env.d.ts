/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare/types.d.ts" />

// Liaisons et variables du Worker, lues avec `import { env } from "cloudflare:workers"`
// (méthode d'accès de @astrojs/cloudflare v14). `App.Locals` ne contient que `cfContext`,
// déclaré par `@astrojs/cloudflare/types.d.ts`.
declare namespace Cloudflare {
  interface Env {
    QUOTA_DB: D1Database;
    SUGGESTIONS_LIMITER: RateLimit;
    ANTHROPIC_API_KEY: string;
    AMAZON_TAG_FR?: string;
    AMAZON_TAG_DE?: string;
    AMAZON_TAG_ES?: string;
    AMAZON_TAG_UK?: string;
    QUOTA_DAILY: string;
    QUOTA_MONTHLY: string;
  }
}

interface Env extends Cloudflare.Env {}
