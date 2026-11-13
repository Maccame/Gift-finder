// Quota journalier et mensuel (principe V, research R4 et R5). Périodes en Europe/Paris.
// Une réservation n'est jamais annulée, même si la génération échoue ensuite (décompte pessimiste).

const TIME_ZONE = "Europe/Paris";

export interface QuotaLimits {
  daily: number;
  monthly: number;
}

export type QuotaPeriod = "daily" | "monthly";

/** Accès au stockage des compteurs (D1 en production, node:sqlite en test). */
export interface QuotaStore {
  /** Exécute les requêtes dans une seule transaction ; renvoie les lignes modifiées par la dernière. */
  runBatch(statements: { sql: string; params: unknown[] }[]): Promise<number>;
  /** Valeur des compteurs (0 si la ligne n'existe pas). */
  getCounts(keys: string[]): Promise<Record<string, number>>;
}

const parts = (date: Date) => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

const pad = (n: number) => String(n).padStart(2, "0");

export function periodKeys(now: Date): { day: string; month: string } {
  const { year, month, day } = parts(now);
  return { day: `day:${year}-${pad(month)}-${pad(day)}`, month: `month:${year}-${pad(month)}` };
}

/** Instant UTC correspondant à minuit à Paris pour une date du calendrier (mois de 1 à 12). */
function parisMidnight(year: number, month: number, day: number): Date {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  // Deux passes suffisent : l'écart entre UTC et Paris est d'une ou deux heures.
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess));
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += target - asUtc;
  }
  return new Date(guess);
}

/** Minuit à Paris du lendemain (quota journalier) ou du 1er du mois suivant (quota mensuel). */
export function availableAgainAt(now: Date, which: QuotaPeriod): string {
  const { year, month, day } = parts(now);
  const next = which === "daily" ? new Date(Date.UTC(year, month - 1, day + 1)) : new Date(Date.UTC(year, month, 1));
  return parisMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()).toISOString();
}

/** Implémentation D1 : `db.batch()` est transactionnel. */
export function d1QuotaStore(db: D1Database): QuotaStore {
  return {
    async runBatch(statements) {
      const results = await db.batch(statements.map(({ sql, params }) => db.prepare(sql).bind(...params)));
      return results.at(-1)?.meta.changes ?? 0;
    },
    async getCounts(keys) {
      const placeholders = keys.map((_, i) => `?${i + 1}`).join(", ");
      const { results } = await db
        .prepare(`SELECT period_key, count FROM quota_counter WHERE period_key IN (${placeholders})`)
        .bind(...keys)
        .all<{ period_key: string; count: number }>();
      const counts: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
      for (const row of results) counts[row.period_key] = row.count;
      return counts;
    },
  };
}

async function exhausted(store: QuotaStore, limits: QuotaLimits, now: Date): Promise<QuotaPeriod | null> {
  const { day, month } = periodKeys(now);
  const counts = await store.getCounts([day, month]);
  if ((counts[month] ?? 0) >= limits.monthly) return "monthly";
  if ((counts[day] ?? 0) >= limits.daily) return "daily";
  return null;
}

export type ReserveResult = { ok: true } | { ok: false; availableAgainAt: string };

/**
 * Réserve une recherche : les deux compteurs passent à +1 ensemble, seulement si les deux sont
 * sous leur limite. SQLite évalue les sous-requêtes sur l'état d'avant la mise à jour (vérifié par
 * tests/unit/quota.test.ts), donc la condition porte bien sur les deux valeurs de départ.
 */
export async function reserve(store: QuotaStore, limits: QuotaLimits, now: Date): Promise<ReserveResult> {
  const { day, month } = periodKeys(now);
  const changes = await store.runBatch([
    { sql: "INSERT OR IGNORE INTO quota_counter (period_key, count) VALUES (?1, 0), (?2, 0)", params: [day, month] },
    {
      sql:
        "UPDATE quota_counter SET count = count + 1 WHERE period_key IN (?1, ?2) " +
        "AND (SELECT count FROM quota_counter WHERE period_key = ?1) < ?3 " +
        "AND (SELECT count FROM quota_counter WHERE period_key = ?2) < ?4",
      params: [day, month, limits.daily, limits.monthly],
    },
  ]);
  if (changes === 2) return { ok: true };
  const which = (await exhausted(store, limits, now)) ?? "daily";
  return { ok: false, availableAgainAt: availableAgainAt(now, which) };
}

export interface QuotaStatus {
  generation: "available" | "limited";
  availableAgainAt: string | null;
}

/** État du quota sans rien réserver (GET /api/status). */
export async function getQuotaStatus(store: QuotaStore, limits: QuotaLimits, now: Date): Promise<QuotaStatus> {
  const which = await exhausted(store, limits, now);
  return which
    ? { generation: "limited", availableAgainAt: availableAgainAt(now, which) }
    : { generation: "available", availableAgainAt: null };
}

/** Limites lues dans les variables du Worker, avec les valeurs de research R4 par défaut. */
export function limitsFromEnv(env: { QUOTA_DAILY?: string; QUOTA_MONTHLY?: string }): QuotaLimits {
  const read = (value: string | undefined, fallback: number) => {
    const n = Number.parseInt(value ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return { daily: read(env.QUOTA_DAILY, 30), monthly: read(env.QUOTA_MONTHLY, 700) };
}
