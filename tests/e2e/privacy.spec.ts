// Aucune donnée au-delà de la session (principe VIII, FR-029, SC-009).
import { expect, test, type Request, type Response } from "@playwright/test";
import { mockApi } from "./helpers/mock-api";
import { fillAll, openApp, results, seeIdeas } from "./helpers/flow";

test("aucun cookie, aucun localStorage, aucune requête tierce, rien après fermeture", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const context = await browser.newContext();
  const page = await context.newPage();
  const foreign: string[] = [];
  const setCookies: string[] = [];
  const onRequest = (request: Request) => {
    const url = new URL(request.url());
    if (!["http:", "https:"].includes(url.protocol)) return;
    if (url.origin !== origin) foreign.push(request.url());
  };
  // Les lectures d'en-têtes sont asynchrones : on les garde pour les attendre avant de fermer
  // le contexte, sinon une réponse tardive rejette après la fermeture et fait échouer le test.
  const pendingHeaders: Promise<void>[] = [];
  const onResponse = (response: Response) => {
    pendingHeaders.push(
      response.headerValue("set-cookie").then((header) => {
        if (header) setCookies.push(`${response.url()} → ${header}`);
      }),
    );
  };
  page.on("request", onRequest);
  page.on("response", onResponse);

  await mockApi(page);
  await openApp(page);
  await fillAll(page);
  await seeIdeas(page).click();
  await expect(results(page)).toHaveCount(6);
  // Un aller-retour réel par le serveur, sans interception, pour vérifier ses en-têtes.
  await page.goto(`${origin}/`);
  await page.waitForURL(/\/(fr|en|es|de)\/$/);
  await page.waitForLoadState("networkidle");
  page.off("request", onRequest);
  page.off("response", onResponse);
  await Promise.all(pendingHeaders);

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
