import { describe, expect, it } from "vitest";
import { pickLocale, redirectToLocale } from "@/lib/locale-redirect";

describe("pickLocale (Accept-Language)", () => {
  it("de-DE,de;q=0.9,en;q=0.8 → de", () => {
    expect(pickLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
  });

  it("langue non prise en charge → fr", () => {
    expect(pickLocale("pt-BR")).toBe("fr");
    expect(pickLocale("pt-BR,pt;q=0.9")).toBe("fr");
  });

  it("en-tête absent ou vide → fr", () => {
    expect(pickLocale(null)).toBe("fr");
    expect(pickLocale(undefined)).toBe("fr");
    expect(pickLocale("")).toBe("fr");
  });

  it("respecte les poids q, pas l'ordre d'écriture", () => {
    expect(pickLocale("en;q=0.5,es;q=0.9")).toBe("es");
    expect(pickLocale("pt;q=1,de;q=0.2,en;q=0.3")).toBe("en");
  });

  it("ignore les langues de poids nul et le joker", () => {
    expect(pickLocale("en;q=0,*;q=0.5")).toBe("fr");
  });

  it("insensible à la casse", () => {
    expect(pickLocale("EN-gb")).toBe("en");
  });
});

describe("redirectToLocale", () => {
  it("redirige / en 302 vers /{locale}/ sans Set-Cookie", () => {
    const response = redirectToLocale(new Request("http://localhost/", { headers: { "Accept-Language": "es-ES,es;q=0.9" } }));
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/es/");
    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(response.headers.get("Vary")).toBe("Accept-Language");
  });

  it("sans préférence reconnue → /fr/", () => {
    expect(redirectToLocale(new Request("http://localhost/")).headers.get("Location")).toBe("/fr/");
  });
});
