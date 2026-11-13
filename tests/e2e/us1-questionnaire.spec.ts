import { expect, test } from "@playwright/test";
import { mockApi, selectionBody } from "./helpers/mock-api";
import { addInterest, chooseOption, fillAll, fillFirstSteps, FIVE_FR, results, seeIdeas } from "./helpers/flow";

test.describe("US1 : questionnaire jusqu'aux idées", () => {
  test("« Étape 1 sur 4 » au chargement de /fr/", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await expect(page.getByText("Étape 1 sur 4")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quelle est l'occasion ?" })).toBeVisible();
  });

  test("« Suivant » bloqué avec le message de l'élément manquant", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByText("Choisissez une occasion pour continuer.")).toBeVisible();
    await expect(page.getByText("Étape 1 sur 4")).toBeVisible();
  });

  test("retour arrière sans perte des réponses", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await fillFirstSteps(page);
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("radio", { name: "De 50 à 100 €" })).toBeChecked();
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("radio", { name: "Ami", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("radio", { name: "Anniversaire" })).toBeChecked();
  });

  test("recherche « mus » : Musicien et Musées", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await fillFirstSteps(page);
    await page.getByRole("searchbox", { name: "Rechercher un centre d'intérêt" }).fill("mus");
    await expect(page.getByRole("button", { name: "Ajouter Musicien" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter Musées" })).toBeVisible();
  });

  test("recherche sans résultat : message et lien vers les catégories", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await fillFirstSteps(page);
    await page.getByRole("searchbox", { name: "Rechercher un centre d'intérêt" }).fill("zzzz");
    await expect(page.getByText("Aucun centre d'intérêt ne correspond.")).toBeVisible();
    await page.getByRole("button", { name: "Parcourir par catégorie" }).click();
    await expect(page.getByText("Musique", { exact: true })).toBeVisible();
  });

  test("4 choix : bouton désactivé avec « Encore 1 centre d'intérêt »", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await fillAll(page, FIVE_FR.slice(0, 4));
    await expect(seeIdeas(page)).toBeDisabled();
    await expect(page.getByText("Encore 1 centre d'intérêt", { exact: true })).toBeVisible();
  });

  test("5 choix puis clic : 6 idées après une seule requête", async ({ page }) => {
    const api = await mockApi(page);
    await page.goto("/fr/");
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(results(page)).toHaveCount(6);
    const first = results(page).first();
    await expect(first.getByRole("heading", { name: "Pédale d'effet pour guitare" })).toBeVisible();
    await expect(first.getByText("69,00 €")).toBeVisible();
    await expect(first.getByText("Musicien")).toBeVisible();
    expect(api.suggestionsCount()).toBe(1);
    expect(api.suggestionsRequests()[0]).toEqual({
      locale: "fr",
      occasionId: "birthday",
      relationId: "friend",
      budgetId: "50_100",
      interestIds: ["musician", "gamer", "flowers", "cooking", "hiking"],
    });
  });

  test("double clic = une seule requête", async ({ page }) => {
    const api = await mockApi(page, { suggestions: [{ status: 200, body: selectionBody("fr"), delayMs: 800 }] });
    await page.goto("/fr/");
    await fillAll(page);
    await seeIdeas(page).dblclick();
    await expect(results(page)).toHaveCount(6);
    expect(api.suggestionsCount()).toBe(1);
  });

  test("ajout bloqué au-delà de 10", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await fillAll(page, [...FIVE_FR, "Musées", "Guitare", "Piano", "Échecs", "Yoga"]);
    await page.getByRole("searchbox", { name: "Rechercher un centre d'intérêt" }).fill("ten");
    await expect(page.getByText("Vous avez choisi 10 centres d'intérêt, le maximum.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter Tennis" })).toBeDisabled();
    await expect(page.getByRole("list", { name: "Centres d'intérêt choisis" }).getByRole("listitem")).toHaveCount(10);
  });

  test("le rechargement de la page conserve les critères", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await fillFirstSteps(page);
    await addInterest(page, "Musicien");
    await page.reload();
    await expect(page.getByText("Étape 4 sur 4")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retirer Musicien" })).toBeVisible();
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("radio", { name: "De 50 à 100 €" })).toBeChecked();
  });

  test("la touche Entrée dans un choix ne quitte pas l'étape sans réponse", async ({ page }) => {
    await mockApi(page);
    await page.goto("/fr/");
    await chooseOption(page, "Noël");
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByText("Étape 2 sur 4")).toBeVisible();
  });
});
