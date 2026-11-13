import { describe, expect, it } from "vitest";
import { byCategory, normalize, searchInterests } from "@/lib/interests-search";
import interests from "@/data/interests.json";

const labelsFr = (list: { labels: { fr: string } }[]) => list.map((i) => i.labels.fr);

describe("normalize", () => {
  it("minuscules, accents retirés, espaces réduits", () => {
    expect(normalize("  Musées   ÉTÉ ")).toBe("musees ete");
  });
});

describe("searchInterests (FR-006)", () => {
  it("« mus » et « MUS » renvoient « Musicien » et « Musées » en français", () => {
    expect(labelsFr(searchInterests("mus", "fr", []))).toEqual(["Musées", "Musicien"]);
    expect(labelsFr(searchInterests("MUS", "fr", []))).toEqual(["Musées", "Musicien"]);
  });

  it("« musee » trouve « Musées » sans tenir compte des accents", () => {
    expect(labelsFr(searchInterests("musee", "fr", []))).toEqual(["Musées"]);
  });

  it("correspond au début d'un mot, pas au milieu", () => {
    // « Jardinage » contient « din » mais ne commence pas par « din ».
    expect(labelsFr(searchInterests("din", "fr", []))).not.toContain("Jardinage");
    // « Plantes d'intérieur » : un mot commence par « int ».
    expect(labelsFr(searchInterests("int", "fr", []))).toContain("Plantes d'intérieur");
  });

  it("exclut les centres d'intérêt déjà choisis", () => {
    expect(labelsFr(searchInterests("mus", "fr", ["musician"]))).toEqual(["Musées"]);
  });

  it("une recherche sans résultat renvoie une liste vide", () => {
    expect(searchInterests("zzzz", "fr", [])).toEqual([]);
  });

  it("une recherche vide ne renvoie rien", () => {
    expect(searchInterests("   ", "fr", [])).toEqual([]);
  });

  it("cherche dans la langue active", () => {
    expect(searchInterests("hik", "en", []).map((i) => i.id)).toContain("hiking");
    expect(searchInterests("hik", "fr", []).map((i) => i.id)).not.toContain("hiking");
  });
});

describe("byCategory", () => {
  it("regroupe tout le référentiel", () => {
    const groups = byCategory("fr", []);
    const total = groups.reduce((n, g) => n + g.interests.length, 0);
    expect(total).toBe(interests.length);
    expect(new Set(groups.map((g) => g.category)).size).toBe(groups.length);
  });

  it("exclut les centres d'intérêt déjà choisis", () => {
    const groups = byCategory("fr", ["musician"]);
    expect(groups.flatMap((g) => g.interests).some((i) => i.id === "musician")).toBe(false);
  });
});
