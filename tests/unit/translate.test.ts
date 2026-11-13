import { describe, expect, it } from "vitest";
import { getLocaleFromUrl, label, messagesFor, t } from "@/lib/i18n";
import { createTranslator, translate, type Messages } from "@/lib/translate";

describe("translate", () => {
  const messages = {
    "step.progress": "Étape {n} sur 4",
    "criteria.missingInterests": { one: "Encore {count} centre d'intérêt", other: "Encore {count} centres d'intérêt" },
  } as unknown as Messages;

  it("remplace les paramètres", () => {
    expect(translate(messages, "fr", "step.progress", { n: 2 })).toBe("Étape 2 sur 4");
  });

  it("choisit la forme plurielle selon la langue", () => {
    expect(translate(messages, "fr", "criteria.missingInterests", { count: 1 })).toBe("Encore 1 centre d'intérêt");
    expect(translate(messages, "fr", "criteria.missingInterests", { count: 3 })).toBe("Encore 3 centres d'intérêt");
    expect(t("en", "criteria.missingInterests", { count: 1 })).toBe("1 more interest needed");
    expect(t("de", "criteria.missingInterests", { count: 4 })).toBe("Noch 4 Interessen");
  });

  it("garde un paramètre inconnu et renvoie la clé si elle manque", () => {
    expect(translate(messages, "fr", "step.progress")).toBe("Étape {n} sur 4");
    expect(translate(messages, "fr", "action.next")).toBe("action.next");
  });

  it("createTranslator lie messages et langue", () => {
    const tr = createTranslator(messagesFor("es"), "es");
    expect(tr("step.progress", { n: 1 })).toBe("Paso 1 de 4");
  });
});

describe("langue de l'URL", () => {
  it("premier segment de l'URL, fr par défaut", () => {
    expect(getLocaleFromUrl(new URL("http://x/de/"))).toBe("de");
    expect(getLocaleFromUrl("/en/")).toBe("en");
    expect(getLocaleFromUrl("/it/")).toBe("fr");
    expect(getLocaleFromUrl("/")).toBe("fr");
  });

  it("label renvoie le libellé de la langue", () => {
    expect(label({ labels: { fr: "Noël", en: "Christmas", es: "Navidad", de: "Weihnachten" } }, "de")).toBe("Weihnachten");
  });
});
