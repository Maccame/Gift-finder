import { expect, test } from "@playwright/test";
import { errors, mockApi, selectionBody } from "./helpers/mock-api";
import { fillAll, results, seeIdeas } from "./helpers/flow";

const limited = { status: 200, body: { generation: "limited", availableAgainAt: "2026-11-11T23:00:00.000Z" } };

test.describe("US1 : quota et erreurs (FR-024, FR-025)", () => {
  test("/api/status « limited » : message à la place du bouton, saisie possible", async ({ page }) => {
    await mockApi(page, { status: limited });
    await page.goto("/fr/");
    await fillAll(page);
    await expect(page.getByText(/Service limité, de nouveau disponible/)).toBeVisible();
    await expect(seeIdeas(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retirer Musicien" })).toBeVisible();
  });

  test("429 au clic : même message de quota", async ({ page }) => {
    await mockApi(page, { suggestions: [errors.quota] });
    await page.goto("/fr/");
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(page.getByText(/Service limité, de nouveau disponible/)).toBeVisible();
    await expect(seeIdeas(page)).toHaveCount(0);
  });

  for (const [name, response, text] of [
    ["504", errors.timeout, "La génération a pris trop de temps."],
    ["502", errors.failed, "La génération des idées a échoué."],
  ] as const) {
    test(`${name} : message et « Réessayer », qui relance une seule requête`, async ({ page }) => {
      const api = await mockApi(page, { suggestions: [response, { status: 200, body: selectionBody("fr") }] });
      await page.goto("/fr/");
      await fillAll(page);
      await seeIdeas(page).click();
      await expect(page.getByText(text)).toBeVisible();
      await page.getByRole("button", { name: "Réessayer" }).click();
      await expect(results(page)).toHaveCount(6);
      expect(api.suggestionsCount()).toBe(2);
    });
  }

  test("422 invite à modifier les critères, bouton désactivé tant que rien ne change", async ({ page }) => {
    await mockApi(page, { suggestions: [errors.noValidIdea] });
    await page.goto("/fr/");
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(page.getByText("Aucune idée ne correspond à ces critères. Modifiez-les puis réessayez.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toHaveCount(0);
    await expect(seeIdeas(page)).toBeDisabled();
    await page.getByRole("button", { name: "Retirer Randonnée" }).click();
    await page.getByRole("searchbox", { name: "Rechercher un centre d'intérêt" }).fill("pia");
    await page.getByRole("button", { name: "Ajouter Piano" }).click();
    await expect(seeIdeas(page)).toBeEnabled();
  });

  test("la liste précédente reste visible après une erreur", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/fr/");
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(results(page)).toHaveCount(6);
    api.respondWith(errors.failed);
    await page.getByRole("radio", { name: "De 20 à 50 €" }).check();
    await page.getByRole("button", { name: "Mettre à jour les idées" }).click();
    await expect(page.getByText("La génération des idées a échoué.")).toBeVisible();
    await expect(results(page)).toHaveCount(6);
  });

  test("429 rate_limited : « Trop de demandes » avec « Réessayer »", async ({ page }) => {
    await mockApi(page, { suggestions: [errors.rateLimited, { status: 200, body: selectionBody("fr") }] });
    await page.goto("/fr/");
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(page.getByText("Trop de demandes, réessayez dans quelques secondes.")).toBeVisible();
    await page.getByRole("button", { name: "Réessayer" }).click();
    await expect(results(page)).toHaveCount(6);
  });
});
