// Parcours complet au clavier seul (ISO 9241-11, principe VII).
import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./helpers/mock-api";
import { openApp } from "./helpers/flow";

/** Description lisible de l'élément actif (rôle implicite, nom accessible approché). */
async function active(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "";
    const name = el.getAttribute("aria-label") ?? el.closest("label")?.textContent ?? el.textContent ?? "";
    const tag = el.tagName.toLowerCase();
    const type = tag === "input" ? `[${el.getAttribute("type")}]` : "";
    return `${tag}${type}:${name.trim().replace(/\s+/g, " ").slice(0, 60)}`;
  });
}

/** Appuie sur Tab jusqu'à atteindre l'élément voulu (au plus `max` fois). */
async function tabTo(page: Page, matches: (desc: string) => boolean, max = 40) {
  const seen: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const desc = await active(page);
    seen.push(desc);
    if (matches(desc)) {
      await expectFocusVisible(page);
      return;
    }
  }
  throw new Error(`élément introuvable au clavier ; focus successifs : ${seen.slice(0, 12).join(" | ")}`);
}

/** Le focus est visible : contour sur l'élément actif ou sur son libellé. */
async function expectFocusVisible(page: Page) {
  const visible = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const styled = (node: Element) => {
      const s = getComputedStyle(node);
      return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
    };
    return styled(el) || (el.closest("label") ? styled(el.closest("label")!) : false);
  });
  expect(visible, `focus non visible sur ${await active(page)}`).toBe(true);
}

async function expectHeadingFocused(page: Page, text: string) {
  await expect.poll(() => active(page)).toBe(`h2:${text}`);
}

test("parcours complet jusqu'aux résultats au clavier seul", async ({ page }) => {
  const api = await mockApi(page);
  await openApp(page);

  // Étape 1 : Tab entre dans le groupe, Espace coche, les flèches changent de choix.
  await tabTo(page, (d) => d.startsWith("input[radio]"));
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "Anniversaire" })).toBeChecked();
  await tabTo(page, (d) => d === "button:Suivant");
  await page.keyboard.press("Enter");
  await expectHeadingFocused(page, "Quelle est votre relation avec cette personne ?");

  // Étape 2, puis retour arrière avec Maj+Tab et Entrée.
  await tabTo(page, (d) => d.startsWith("input[radio]"));
  await page.keyboard.press("Space");
  await tabTo(page, (d) => d === "button:Suivant");
  await page.keyboard.press("Shift+Tab");
  expect(await active(page)).toBe("button:Retour");
  await page.keyboard.press("Enter");
  await expectHeadingFocused(page, "Quelle est l'occasion ?");
  await tabTo(page, (d) => d === "button:Suivant");
  await page.keyboard.press("Enter");
  await tabTo(page, (d) => d === "button:Suivant");
  await page.keyboard.press("Enter");

  // Étape 3.
  await expectHeadingFocused(page, "Quel est votre budget ?");
  await tabTo(page, (d) => d.startsWith("input[radio]"));
  await page.keyboard.press("Space");
  await tabTo(page, (d) => d === "button:Suivant");
  await page.keyboard.press("Enter");

  // Étape 4 : recherche puis ajout, le focus revient dans le champ de recherche.
  await expectHeadingFocused(page, "Quels sont ses centres d'intérêt ?");
  for (const [query, label] of [
    ["musi", "Musicien"],
    ["game", "Gamer"],
    ["fleu", "Aime les fleurs"],
    ["cuis", "Cuisine"],
    ["rand", "Randonnée"],
  ]) {
    await tabTo(page, (d) => d.startsWith("input[search]"));
    await page.keyboard.type(query);
    await tabTo(page, (d) => d === `button:Ajouter ${label}`);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: `Retirer ${label}` })).toBeVisible();
    expect(await active(page)).toMatch(/^input\[search\]/);
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
  }

  // Validation et arrivée des résultats.
  await tabTo(page, (d) => d === "button:Voir les idées");
  await page.keyboard.press("Enter");
  await expectHeadingFocused(page, "Vos idées cadeaux");
  expect(api.suggestionsCount()).toBe(1);
});
