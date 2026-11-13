// Actions communes du parcours (textes français).
import { expect, type Page } from "@playwright/test";

export const FIVE_FR = ["Musicien", "Gamer", "Aime les fleurs", "Cuisine", "Randonnée"];

export async function chooseOption(page: Page, name: string) {
  await page.getByRole("radio", { name, exact: true }).check();
}

/** Ajoute un centre d'intérêt par la recherche. */
export async function addInterest(page: Page, label: string, query = label.slice(0, 4)) {
  const search = page.getByRole("searchbox", { name: "Rechercher un centre d'intérêt" });
  await search.fill(query);
  await page.getByRole("button", { name: `Ajouter ${label}`, exact: true }).click();
}

/** Remplit les 3 premières étapes (Anniversaire, Ami, 50 à 100 €) et arrive à l'étape 4. */
export async function fillFirstSteps(page: Page) {
  await expect(page.getByText("Étape 1 sur 4")).toBeVisible();
  await chooseOption(page, "Anniversaire");
  await page.getByRole("button", { name: "Suivant" }).click();
  await chooseOption(page, "Ami");
  await page.getByRole("button", { name: "Suivant" }).click();
  await chooseOption(page, "De 50 à 100 €");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.getByText("Étape 4 sur 4")).toBeVisible();
}

export async function fillAll(page: Page, interests = FIVE_FR) {
  await fillFirstSteps(page);
  for (const label of interests) await addInterest(page, label);
}

export const seeIdeas = (page: Page) => page.getByRole("button", { name: "Voir les idées" });
export const results = (page: Page) => page.getByRole("list", { name: "Idées cadeaux" }).getByRole("listitem");
