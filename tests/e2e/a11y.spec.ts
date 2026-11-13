// Accessibilité WCAG A et AA (ISO 9241-11, principe VII) : aucune violation axe sur les écrans clés.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { errors, mockApi, selectionBody } from "./helpers/mock-api";
import { openApp } from "./helpers/flow";
import { LOCALES, UI, walkQuestionnaire } from "./helpers/locales";

async function expectNoViolations(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(
    violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    `violations axe sur ${screen}`,
  ).toEqual([]);
}

for (const locale of LOCALES) {
  test.describe(`accessibilité en ${locale}`, () => {
    test("4 étapes, catégories ouvertes et résultats avec liens affiliés", async ({ page }) => {
      await mockApi(page, { suggestions: [{ status: 200, body: selectionBody(locale, { affiliate: true }) }] });
      await openApp(page, `/${locale}/`);
      await walkQuestionnaire(page, locale, async (step) => {
        if (step === 4) await page.locator("details").first().evaluate((d) => ((d as HTMLDetailsElement).open = true));
        await expectNoViolations(page, `étape ${step}`);
      });
      await expectNoViolations(page, "résultats");
    });

    test("message de quota et message d'erreur", async ({ page }) => {
      const limited = { status: 200, body: { generation: "limited", availableAgainAt: "2026-11-11T23:00:00.000Z" } };
      await mockApi(page, { status: limited });
      await openApp(page, `/${locale}/`);
      await walkQuestionnaire(page, locale, async () => {}, false);
      await expect(page.getByRole("button", { name: UI[locale].seeIdeas })).toHaveCount(0);
      await expectNoViolations(page, "quota atteint");
    });

    test("message d'erreur avec « Réessayer »", async ({ page }) => {
      await mockApi(page, { suggestions: [errors.failed] });
      await openApp(page, `/${locale}/`);
      await walkQuestionnaire(page, locale, async () => {}, false);
      await page.getByRole("button", { name: UI[locale].seeIdeas }).click();
      await expect(page.getByRole("alert")).toBeVisible();
      await expectNoViolations(page, "erreur");
    });
  });
}
