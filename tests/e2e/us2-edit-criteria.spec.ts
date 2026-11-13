import { expect, test } from "@playwright/test";
import { mockApi, selectionBody } from "./helpers/mock-api";
import { fillAll, openApp, results, seeIdeas } from "./helpers/flow";

const update = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Mettre à jour les idées" });
const stale = (page: import("@playwright/test").Page) =>
  page.getByText("Vos critères ont changé : mettez à jour pour voir de nouvelles idées.");

test.describe("US2 : modifier les critères depuis les résultats", () => {
  async function showResults(page: import("@playwright/test").Page) {
    const api = await mockApi(page, { suggestions: [{ status: 200, body: selectionBody("fr") }] });
    await openApp(page);
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(results(page)).toHaveCount(6);
    return api;
  }

  test("modifications sans validation : aucune requête et signal visible", async ({ page }) => {
    const api = await showResults(page);
    await expect(update(page)).toBeDisabled();
    await expect(stale(page)).toHaveCount(0);
    await page.getByRole("radio", { name: "De 20 à 50 €" }).check();
    await page.getByRole("button", { name: "Retirer Gamer" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un centre d'intérêt" }).fill("ech");
    await page.getByRole("button", { name: "Ajouter Échecs" }).click();
    await expect(stale(page)).toBeVisible();
    await expect(results(page)).toHaveCount(6);
    await expect(results(page).first().getByRole("heading")).toHaveText("Pédale d'effet pour guitare");
    expect(api.suggestionsCount()).toBe(1);
  });

  test("retour aux critères d'origine : signal masqué et bouton désactivé", async ({ page }) => {
    await showResults(page);
    await page.getByRole("radio", { name: "De 20 à 50 €" }).check();
    await expect(stale(page)).toBeVisible();
    await expect(update(page)).toBeEnabled();
    await page.getByRole("radio", { name: "De 50 à 100 €" }).check();
    await expect(stale(page)).toHaveCount(0);
    await expect(update(page)).toBeDisabled();
  });

  test("validation : une requête et liste remplacée", async ({ page }) => {
    const api = await showResults(page);
    api.respondWith({ status: 200, body: selectionBody("fr", { fixture: "out-of-budget" }) });
    await page.getByRole("radio", { name: "Noël" }).check();
    await update(page).click();
    await expect(results(page)).toHaveCount(6);
    await expect(results(page).nth(1).getByRole("heading")).toHaveText("Porte-clés manette");
    await expect(stale(page)).toHaveCount(0);
    expect(api.suggestionsCount()).toBe(2);
    expect((api.suggestionsRequests()[1] as { occasionId: string }).occasionId).toBe("christmas");
  });

  test("moins de 5 centres d'intérêt : bouton désactivé avec le nombre manquant", async ({ page }) => {
    await showResults(page);
    await page.getByRole("button", { name: "Retirer Gamer" }).click();
    await page.getByRole("button", { name: "Retirer Cuisine" }).click();
    await expect(update(page)).toBeDisabled();
    await expect(page.getByText("Encore 2 centres d'intérêt", { exact: true })).toBeVisible();
  });

  test("double clic sur « Mettre à jour » : une seule requête", async ({ page }) => {
    const api = await showResults(page);
    api.respondWith({ status: 200, body: selectionBody("fr"), delayMs: 800 });
    await page.getByRole("radio", { name: "Noël" }).check();
    await update(page).dblclick();
    await expect(update(page)).toBeDisabled();
    await expect(stale(page)).toHaveCount(0);
    expect(api.suggestionsCount()).toBe(2);
  });
});
