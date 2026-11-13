// Aucune donnée au-delà de la session (principe VIII, FR-029, SC-009).
import { expect, test } from "@playwright/test";
import { mockApi } from "./helpers/mock-api";
import { fillAll, openApp, results, seeIdeas } from "./helpers/flow";

test("aucun cookie, aucun localStorage, aucune requête tierce, rien après fermeture", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const context = await browser.newContext();
  const page = await context.newPage();
  const foreign: string[] = [];
  const setCookies: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["http:", "https:"].includes(url.protocol)) return;
    if (url.origin !== origin) foreign.push(request.url());
  });
  page.on("response", async (response) => {
    const header = await response.headerValue("set-cookie");
    if (header) setCookies.push(`${response.url()} → ${header}`);
  });

  await mockApi(page);
  await openApp(page);
  await fillAll(page);
  await seeIdeas(page).click();
  await expect(results(page)).toHaveCount(6);
  // Un aller-retour réel par le serveur, sans interception, pour vérifier ses en-têtes.
  await page.goto(`${origin}/`);
  await page.waitForURL(/\/(fr|en|es|de)\/$/);

  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
  expect(await page.evaluate(() => indexedDB.databases().then((dbs) => dbs.length))).toBe(0);
  expect(foreign).toEqual([]);
  expect(setCookies).toEqual([]);
  await context.close();

  // Nouvelle session (onglet fermé puis rouvert) : aucun critère restauré.
  const fresh = await browser.newContext();
  const page2 = await fresh.newPage();
  await mockApi(page2);
  await openApp(page2);
  await expect(page2.getByText("Étape 1 sur 4")).toBeVisible();
  await expect(page2.getByRole("radio", { checked: true })).toHaveCount(0);
  const stored = await page2.evaluate(() => window.sessionStorage.getItem("gift-finder:v1"));
  expect(stored === null || JSON.parse(stored).draft.occasionId === null).toBe(true);
  await fresh.close();
});
