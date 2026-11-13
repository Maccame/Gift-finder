import { expect, test } from "@playwright/test";
import { mockApi, selectionBody } from "./helpers/mock-api";
import { fillAll, openApp, results, seeIdeas } from "./helpers/flow";

test.describe("US3 : liens d'achat (FR-020 à FR-023)", () => {
  test("chaque idée a un lien Amazon et un lien Etsy qui s'ouvrent dans un nouvel onglet", async ({ page }) => {
    await mockApi(page, { suggestions: [{ status: 200, body: selectionBody("fr") }] });
    await openApp(page);
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(results(page)).toHaveCount(6);
    for (const item of await results(page).all()) {
      const amazon = item.getByRole("link", { name: /Chercher sur Amazon/ });
      const etsy = item.getByRole("link", { name: /Chercher sur Etsy/ });
      await expect(amazon).toHaveAttribute("href", /^https:\/\/www\.amazon\.fr\/s\?k=/);
      await expect(etsy).toHaveAttribute("href", /^https:\/\/www\.etsy\.com\/search\?q=/);
      for (const link of [amazon, etsy]) {
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    }
  });

  test("sans affiliation : aucune mention « lien affilié »", async ({ page }) => {
    await mockApi(page, { suggestions: [{ status: 200, body: selectionBody("fr") }] });
    await openApp(page);
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(results(page)).toHaveCount(6);
    await expect(page.getByText("lien affilié")).toHaveCount(0);
  });

  test("avec affiliation : 2 liens affiliés signalés et marqués sponsored", async ({ page }) => {
    await mockApi(page, { suggestions: [{ status: 200, body: selectionBody("fr", { affiliate: true }) }] });
    await openApp(page);
    await fillAll(page);
    await seeIdeas(page).click();
    await expect(results(page)).toHaveCount(6);
    await expect(page.getByText("lien affilié", { exact: true })).toHaveCount(2);
    for (const index of [0, 1]) {
      const amazon = results(page).nth(index).getByRole("link", { name: /Chercher sur Amazon/ });
      await expect(amazon).toHaveAttribute("rel", "sponsored noopener noreferrer");
      await expect(amazon).toHaveAccessibleName(/lien affilié/);
    }
    const third = results(page).nth(2).getByRole("link", { name: /Chercher sur Amazon/ });
    await expect(third).toHaveAttribute("rel", "noopener noreferrer");
  });
});
