import { expect, test, type Page } from "@playwright/test";
import { mockApi, selectionBody } from "./helpers/mock-api";
import { fillAll, openApp, results, seeIdeas, waitForApp } from "./helpers/flow";

type Locale = "en" | "es" | "de";

const UI: Record<Locale, {
  progress: string;
  next: string;
  search: string;
  add: (label: string) => string;
  seeIdeas: string;
  list: string;
  options: [string, string, string];
  interests: string[];
}> = {
  en: {
    progress: "Step 1 of 4",
    next: "Next",
    search: "Search for an interest",
    add: (l) => `Add ${l}`,
    seeIdeas: "See gift ideas",
    list: "Gift ideas",
    options: ["Birthday", "Friend", "€50 to €100"],
    interests: ["Musician", "Gamer", "Loves flowers", "Cooking", "Hiking"],
  },
  es: {
    progress: "Paso 1 de 4",
    next: "Siguiente",
    search: "Buscar un interés",
    add: (l) => `Añadir ${l}`,
    seeIdeas: "Ver las ideas",
    list: "Ideas de regalo",
    options: ["Cumpleaños", "Amigo", "De 50 a 100 €"],
    interests: ["Músico", "Gamer", "Le encantan las flores", "Cocina", "Senderismo"],
  },
  de: {
    progress: "Schritt 1 von 4",
    next: "Weiter",
    search: "Nach einem Interesse suchen",
    add: (l) => `${l} hinzufügen`,
    seeIdeas: "Ideen anzeigen",
    list: "Geschenkideen",
    options: ["Geburtstag", "Freund oder Freundin", "50 bis 100 €"],
    interests: ["Musiker", "Gamer", "Liebt Blumen", "Kochen", "Wandern"],
  },
};

/** Textes français qui ne doivent jamais apparaître dans une autre langue. */
const FRENCH = ["Étape", "Suivant", "Retour", "Voir les idées", "Rechercher un centre", "Vos idées", "Prix indicatif", "Centres d'intérêt", "Choisissez", "Anniversaire"];

async function expectNoFrench(page: Page) {
  const text = await page.locator("body").innerText();
  for (const word of FRENCH) expect(text, `texte français résiduel : ${word}`).not.toContain(word);
}

test.describe("US4 : langues (FR-026 à FR-028)", () => {
  test.describe("sans langue reconnue", () => {
    test.use({ locale: "pt-BR" });

    test("/ redirige vers /fr/", async ({ page }) => {
      await mockApi(page);
      await page.goto("/");
      await expect(page).toHaveURL(/\/fr\/$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    });
  });

  for (const locale of ["en", "es", "de"] as const) {
    test(`parcours complet en /${locale}/ sans texte français`, async ({ page }) => {
      const ui = UI[locale];
      await mockApi(page, { suggestions: [{ status: 200, body: selectionBody(locale) }] });
      await openApp(page, `/${locale}/`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByText(ui.progress)).toBeVisible();
      await expectNoFrench(page);

      for (const option of ui.options) {
        await page.getByRole("radio", { name: option, exact: true }).check();
        await expectNoFrench(page);
        await page.getByRole("button", { name: ui.next }).click();
      }
      for (const label of ui.interests) {
        await page.getByRole("searchbox", { name: ui.search }).fill(label.slice(0, 4));
        await page.getByRole("button", { name: ui.add(label), exact: true }).click();
      }
      await expectNoFrench(page);
      await page.getByRole("button", { name: ui.seeIdeas }).click();
      await expect(page.getByRole("list", { name: ui.list }).locator(":scope > li")).toHaveCount(6);
      await expectNoFrench(page);
    });
  }

  test("changer de langue depuis les résultats : critères conservés, aucune requête, signal affiché", async ({ page }) => {
    const api = await mockApi(page, { suggestions: [{ status: 200, body: selectionBody("fr") }] });
    await openApp(page);
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(results(page)).toHaveCount(6);

    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/$/);
    await waitForApp(page);
    await expect(page.getByText("Your criteria have changed: update to see new ideas.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Gift ideas" }).locator(":scope > li")).toHaveCount(6);
    await expect(page.getByRole("radio", { name: "€50 to €100" })).toBeChecked();
    await expect(page.getByRole("button", { name: "Remove Musician" })).toBeVisible();
    expect(api.suggestionsCount()).toBe(1);

    api.respondWith({ status: 200, body: selectionBody("en") });
    await page.getByRole("button", { name: "Update ideas" }).click();
    await expect(page.getByRole("heading", { name: "Guitar effects pedal" })).toBeVisible();
    expect(api.suggestionsCount()).toBe(2);
    expect((api.suggestionsRequests()[1] as { locale: string }).locale).toBe("en");
  });

  test("sélecteur de langue : nom de chaque langue dans sa langue, langue active signalée", async ({ page }) => {
    await mockApi(page);
    await openApp(page, "/de/");
    const nav = page.getByRole("navigation", { name: "Sprache" });
    for (const [name, lang] of [["Français", "fr"], ["English", "en"], ["Español", "es"], ["Deutsch", "de"]] as const) {
      const link = nav.getByRole("link", { name });
      await expect(link).toHaveAttribute("hreflang", lang);
      await expect(link).toHaveAttribute("lang", lang);
    }
    await expect(nav.getByRole("link", { name: "Deutsch" })).toHaveAttribute("aria-current", "page");
  });
});
