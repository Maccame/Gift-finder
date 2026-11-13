import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LOCALES = ["fr", "en", "es", "de"] as const;
type Messages = Record<string, string | Record<string, string>>;

const load = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const messages: Record<string, Messages> = Object.fromEntries(LOCALES.map((l) => [l, load(`src/i18n/${l}.json`)]));
const dataFiles = ["occasions", "relations", "budgets", "interests"] as const;
const data = Object.fromEntries(dataFiles.map((f) => [f, load(`src/data/${f}.json`)])) as Record<
  (typeof dataFiles)[number],
  { id: string; labels: Record<string, string> }[]
>;

describe("traductions de l'interface (SC-008)", () => {
  const frKeys = Object.keys(messages.fr).sort();

  it.each(LOCALES)("%s a exactement les mêmes clés que fr", (locale) => {
    expect(Object.keys(messages[locale]).sort()).toEqual(frKeys);
  });

  it.each(LOCALES)("%s n'a aucune valeur vide", (locale) => {
    for (const [key, value] of Object.entries(messages[locale])) {
      const forms = typeof value === "string" ? [value] : Object.values(value);
      expect(forms.length, key).toBeGreaterThan(0);
      for (const form of forms) expect(form.trim(), `${locale}:${key}`).not.toBe("");
    }
  });

  it("une clé plurielle a les mêmes formes dans les 4 langues", () => {
    for (const key of frKeys) {
      const shapes = LOCALES.map((l) => {
        const v = messages[l][key];
        return typeof v === "string" ? "string" : Object.keys(v).sort().join(",");
      });
      expect(new Set(shapes).size, key).toBe(1);
      if (shapes[0] !== "string") expect(shapes[0]).toContain("other");
    }
  });
});

describe("données de référence", () => {
  it.each(dataFiles)("%s : libellé non vide dans les 4 langues", (file) => {
    for (const entry of data[file]) {
      for (const locale of LOCALES) {
        expect(entry.labels[locale]?.trim(), `${file}:${entry.id}:${locale}`).toBeTruthy();
      }
    }
  });

  it.each(dataFiles)("%s : identifiants uniques", (file) => {
    const ids = data[file].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("interests.json contient entre 140 et 160 entrées", () => {
    expect(data.interests.length).toBeGreaterThanOrEqual(140);
    expect(data.interests.length).toBeLessThanOrEqual(160);
  });

  it("chaque catégorie de centre d'intérêt a un libellé traduit", () => {
    for (const entry of data.interests as unknown as { category: string }[]) {
      expect(messages.fr[`category.${entry.category}`], entry.category).toBeTruthy();
    }
  });
});
