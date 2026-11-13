// Remplace le module `cloudflare:workers` dans Vitest : les tests injectent leurs dépendances.
export const env = {} as Record<string, unknown>;
