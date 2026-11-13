import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { availableAgainAt, getQuotaStatus, periodKeys, reserve, type QuotaStore } from "@/lib/quota";

const MIGRATION = readFileSync(new URL("../../migrations/0001_quota_counter.sql", import.meta.url), "utf8");
const LIMITS = { daily: 30, monthly: 700 };

/** Adaptateur QuotaStore de test sur node:sqlite : le lot s'exécute entre BEGIN et COMMIT. */
function sqliteStore(db: DatabaseSync): QuotaStore {
  return {
    async runBatch(statements) {
      db.exec("BEGIN");
      try {
        let changes = 0;
        for (const { sql, params } of statements) {
          changes = Number(db.prepare(sql).run(...(params as (string | number)[])).changes);
        }
        db.exec("COMMIT");
        return changes;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async getCounts(keys) {
      const counts: Record<string, number> = {};
      for (const key of keys) {
        const row = db.prepare("SELECT count FROM quota_counter WHERE period_key = ?").get(key) as { count: number } | undefined;
        counts[key] = row?.count ?? 0;
      }
      return counts;
    },
  };
}

function setCount(db: DatabaseSync, key: string, count: number) {
  db.prepare("INSERT INTO quota_counter (period_key, count) VALUES (?, ?) ON CONFLICT(period_key) DO UPDATE SET count = excluded.count").run(key, count);
}
function getCount(db: DatabaseSync, key: string) {
  return (db.prepare("SELECT count FROM quota_counter WHERE period_key = ?").get(key) as { count: number } | undefined)?.count ?? 0;
}

describe("periodKeys (Europe/Paris)", () => {
  it("jour et mois en heure de Paris", () => {
    expect(periodKeys(new Date("2026-11-11T10:00:00Z"))).toEqual({ day: "day:2026-11-11", month: "month:2026-11" });
  });

  it("23 h 30 UTC le 31 décembre = 1er janvier à Paris", () => {
    expect(periodKeys(new Date("2026-12-31T23:30:00Z"))).toEqual({ day: "day:2027-01-01", month: "month:2027-01" });
  });

  it("changements d'heure (29 mars et 25 octobre 2026)", () => {
    // 29 mars : passage à l'heure d'été à 01:00 UTC.
    expect(periodKeys(new Date("2026-03-28T22:59:00Z")).day).toBe("day:2026-03-28");
    expect(periodKeys(new Date("2026-03-28T23:00:00Z")).day).toBe("day:2026-03-29");
    expect(periodKeys(new Date("2026-03-29T21:59:00Z")).day).toBe("day:2026-03-29");
    expect(periodKeys(new Date("2026-03-29T22:00:00Z")).day).toBe("day:2026-03-30");
    // 25 octobre : retour à l'heure d'hiver à 01:00 UTC.
    expect(periodKeys(new Date("2026-10-24T21:59:00Z")).day).toBe("day:2026-10-24");
    expect(periodKeys(new Date("2026-10-24T22:00:00Z")).day).toBe("day:2026-10-25");
    expect(periodKeys(new Date("2026-10-25T22:59:00Z")).day).toBe("day:2026-10-25");
    expect(periodKeys(new Date("2026-10-25T23:00:00Z")).day).toBe("day:2026-10-26");
  });
});

describe("availableAgainAt", () => {
  it("quota journalier : minuit à Paris le lendemain", () => {
    expect(availableAgainAt(new Date("2026-11-11T10:00:00Z"), "daily")).toBe("2026-11-11T23:00:00.000Z");
    expect(availableAgainAt(new Date("2026-07-14T10:00:00Z"), "daily")).toBe("2026-07-14T22:00:00.000Z");
  });

  it("quota journalier la veille d'un changement d'heure", () => {
    expect(availableAgainAt(new Date("2026-03-28T12:00:00Z"), "daily")).toBe("2026-03-28T23:00:00.000Z");
    expect(availableAgainAt(new Date("2026-10-25T12:00:00Z"), "daily")).toBe("2026-10-25T23:00:00.000Z");
  });

  it("quota mensuel : le 1er du mois suivant à minuit à Paris", () => {
    expect(availableAgainAt(new Date("2026-11-11T10:00:00Z"), "monthly")).toBe("2026-11-30T23:00:00.000Z");
    expect(availableAgainAt(new Date("2026-12-31T23:30:00Z"), "monthly")).toBe("2027-01-31T23:00:00.000Z");
    expect(availableAgainAt(new Date("2026-06-15T10:00:00Z"), "monthly")).toBe("2026-06-30T22:00:00.000Z");
  });
});

describe("reserve (D1 simulée par node:sqlite)", () => {
  const now = new Date("2026-11-11T10:00:00Z");
  const { day, month } = periodKeys(now);
  let db: DatabaseSync;
  let store: QuotaStore;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(MIGRATION);
    store = sqliteStore(db);
  });

  it("la 30e réservation du jour passe, la 31e est refusée", async () => {
    for (let i = 0; i < 30; i++) expect((await reserve(store, LIMITS, now)).ok).toBe(true);
    expect(await reserve(store, LIMITS, now)).toEqual({ ok: false, availableAgainAt: "2026-11-11T23:00:00.000Z" });
    expect(getCount(db, day)).toBe(30);
    expect(getCount(db, month)).toBe(30);
  });

  it("jour à 29 et mois sous sa limite : la réservation passe et les deux compteurs font +1", async () => {
    setCount(db, day, 29);
    setCount(db, month, 100);
    expect(await reserve(store, LIMITS, now)).toEqual({ ok: true });
    expect(getCount(db, day)).toBe(30);
    expect(getCount(db, month)).toBe(101);
  });

  it("mois à 700 : refus mensuel, aucun compteur ne bouge", async () => {
    setCount(db, day, 3);
    setCount(db, month, 700);
    expect(await reserve(store, LIMITS, now)).toEqual({ ok: false, availableAgainAt: "2026-11-30T23:00:00.000Z" });
    expect(getCount(db, day)).toBe(3);
    expect(getCount(db, month)).toBe(700);
  });

  it("un refus mensuel n'incrémente pas le compteur du jour", async () => {
    setCount(db, month, 700);
    await reserve(store, LIMITS, now);
    expect(getCount(db, day)).toBe(0);
  });
});

describe("getQuotaStatus", () => {
  const now = new Date("2026-11-11T10:00:00Z");
  const { day, month } = periodKeys(now);

  it("disponible sous les quotas, sans rien réserver", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATION);
    expect(await getQuotaStatus(sqliteStore(db), LIMITS, now)).toEqual({ generation: "available", availableAgainAt: null });
    expect(getCount(db, day)).toBe(0);
  });

  it("limité avec la bonne date (jour puis mois)", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(MIGRATION);
    setCount(db, day, 30);
    expect(await getQuotaStatus(sqliteStore(db), LIMITS, now)).toEqual({
      generation: "limited",
      availableAgainAt: "2026-11-11T23:00:00.000Z",
    });
    setCount(db, month, 700);
    expect(await getQuotaStatus(sqliteStore(db), LIMITS, now)).toEqual({
      generation: "limited",
      availableAgainAt: "2026-11-30T23:00:00.000Z",
    });
  });
});
