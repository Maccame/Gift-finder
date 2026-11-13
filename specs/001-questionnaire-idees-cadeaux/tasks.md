---

description: "Liste des tâches du questionnaire guidé d'idées cadeaux"
---

# Tasks: Questionnaire guidé d'idées cadeaux

**Input**: documents de conception de `specs/001-questionnaire-idees-cadeaux/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[contracts/llm-output.md](./contracts/llm-output.md), [quickstart.md](./quickstart.md)

**Tests**: obligatoires (constitution v2.1.0, principe IV). Dans chaque phase, les tests sont
écrits d'abord et doivent échouer avant l'implémentation. L'IA est toujours simulée ; aucun test
n'appelle l'API payante.

**Organization**: les tâches sont regroupées par user story pour que chacune puisse être
implémentée, testée et livrée seule.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : peut être faite en parallèle (fichiers différents, aucune dépendance en attente)
- **[Story]** : user story concernée (US1 à US4)
- Chaque description donne le chemin exact du fichier

## Règles valables pour toutes les tâches

- **Un commit à la fin de chaque tâche** (principe I), message au format
  `type(portée): description (Txxx)`, par exemple `feat(quota): réservation atomique D1 (T034)`.
- **Aucun texte visible codé en dur** (principe III) : toute tâche qui ajoute un texte d'interface
  ajoute la clé dans les **quatre** fichiers `src/i18n/{fr,en,es,de}.json` dans le même commit.
  Le test de complétude (T019) échoue sinon.
- **Aucune persistance** (principe VIII) : pas de cookie, pas de `localStorage`, pas
  d'IndexedDB, pas de `console.log` de critères ou de réponses côté serveur.
- **Aucun secret** (principe II) : les valeurs ne vont que dans `.dev.vars` (ignoré) ou dans
  `wrangler secret put`.
- Avant d'écrire du code qui appelle l'API Claude (T041), vérifier la forme exacte des paramètres
  dans la documentation du SDK `@anthropic-ai/sdk` (skill `claude-api`), sans la deviner.

## Path Conventions

Un seul projet Astro à la racine du dépôt (voir [plan.md](./plan.md), Project Structure) :
`src/`, `tests/`, `migrations/`, `.github/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: initialiser le projet Astro, l'outillage de test et les garde-fous du dépôt

- [X] T001 Vérifier que la PR `chore/gitignore-dev-vars` est fusionnée dans `main`, puis fusionner `main` dans `001-questionnaire-idees-cadeaux` ; contrôler que `.gitignore` contient `.dev.vars`, `.dev.vars.*`, `!.dev.vars.example` et `.wrangler/` ; installer gitleaks (`brew install gitleaks`) et vérifier `gitleaks version`
- [X] T002 Créer `package.json` à la racine (`"type": "module"`, `"private": true`, `"engines": { "node": ">=24" }`) avec les scripts `dev` (`astro dev`), `build` (`astro build`), `preview` (`astro preview`), `check` (`astro check`), `test` (`vitest run --coverage`), `test:e2e` (`playwright test`), `test:all` (`npm test && npm run test:e2e`, commande unique exigée par le principe IV), `test:report` (`node scripts/test-report.mjs`) et `prepare` (`git config core.hooksPath .githooks`), sans toucher à `.specify/`, `.claude/` ni `specs/`
- [X] T003 Installer les dépendances : `astro`, `@astrojs/cloudflare`, `@astrojs/svelte`, `svelte@5`, `@anthropic-ai/sdk`, `zod` ; en développement : `typescript`, `@astrojs/check`, `wrangler`, `@cloudflare/workers-types`, `vitest`, `@vitest/coverage-v8`, `@playwright/test`, `@axe-core/playwright` ; puis `npx playwright install chromium` ; vérifier que `package-lock.json` est commité
- [X] T004 Créer `tsconfig.json` qui étend `astro/tsconfigs/strict`, avec `"types": ["@cloudflare/workers-types"]` et l'alias `"@/*": ["src/*"]`
- [X] T005 Créer `astro.config.mjs` : `output: "server"`, adaptateur `cloudflare()`, intégration `svelte()`, `i18n: { locales: ["fr","en","es","de"], defaultLocale: "fr", routing: { prefixDefaultLocale: true, redirectToDefaultLocale: true } }`, sans aucune intégration d'analytics ni police externe
- [X] T006 [P] Créer `wrangler.jsonc` : nom du Worker `gift-finder`, `compatibility_date` du jour, liaison D1 `QUOTA_DB` (`database_name: "quota"`, `migrations_dir: "migrations"`, `database_id` à remplir en T077), variables `QUOTA_DAILY: "30"` et `QUOTA_MONTHLY: "700"`, et `"observability": { "enabled": false }` (principe VIII)
- [X] T007 [P] Créer `.dev.vars.example` avec les clés sans valeur : `ANTHROPIC_API_KEY=`, `AMAZON_TAG_FR=`, `AMAZON_TAG_DE=`, `AMAZON_TAG_ES=`, `AMAZON_TAG_UK=`, et un commentaire « copier en .dev.vars, ne jamais commiter »
- [X] T008 [P] Créer `src/env.d.ts` qui déclare l'interface `Env` : `QUOTA_DB: D1Database`, `ANTHROPIC_API_KEY: string`, `AMAZON_TAG_FR?`, `AMAZON_TAG_DE?`, `AMAZON_TAG_ES?`, `AMAZON_TAG_UK?` (chaînes), `QUOTA_DAILY: string`, `QUOTA_MONTHLY: string`, et le type de `App.Locals` attendu par la version installée de `@astrojs/cloudflare`
- [X] T009 [P] Créer `vitest.config.ts` : environnement `node`, `include: ["tests/unit/**/*.test.ts"]`, couverture `v8` limitée à `src/lib/**` et `src/pages/api/**`, rapporteurs `text`, `json-summary` et `json` (fichier `test-results/vitest.json`), alias `@` vers `src`
- [X] T010 [P] Créer `playwright.config.ts` : `testDir: "tests/e2e"`, serveur `npm run dev` sur le port 4321 avec `reuseExistingServer: !process.env.CI`, projets `chromium-desktop` (1280×800) et `chromium-mobile` (`devices["Pixel 7"]`), rapporteurs `list` et `json` (fichier `test-results/playwright.json`) ; les appels `/api/*` sont toujours interceptés par les tests
- [X] T011 Créer le hook `.githooks/pre-commit` (exécutable) qui sort en erreur si gitleaks est absent (`command -v gitleaks || { echo "Installez gitleaks : brew install gitleaks"; exit 1; }`), puis lance `gitleaks protect --staged --redact` et bloque le commit en cas de fuite ; l'activer tout de suite avec `git config core.hooksPath .githooks` (le script `prepare` le refera à chaque `npm install`). À faire juste après T001, avant T002
- [X] T012 [P] Créer `.github/pull_request_template.md` : résumé, cases de conformité pour les principes I à VIII de la constitution v2.1.0, impact budgétaire, et une section délimitée par `<!-- test-report:start -->` et `<!-- test-report:end -->` que la CI remplit
- [ ] T013 Protéger la branche `main` sur GitHub (Settings → Branches) : fusion par PR uniquement, contrôles `ci` et `secrets` au vert obligatoires, push direct interdit ; activer « Automatically delete head branches » ; créer `specs/001-questionnaire-idees-cadeaux/launch-checklist.md` avec les sections Dépôt, Fournisseurs, Prévisualisation, Validation et Ouverture, y cocher la protection de `main`, et commiter ce fichier

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: CI, types, données de référence, traductions et page de base dont dépendent toutes les
user stories

**⚠️ CRITICAL**: aucune user story ne peut commencer avant la fin de cette phase

- [X] T014 Créer `scripts/test-report.mjs` : lit `test-results/vitest.json`, `coverage/coverage-summary.json` et `test-results/playwright.json`, et écrit `test-results/report.md` avec la commande, la date (UTC), le nombre de tests réussis, échoués et ignorés pour chaque suite, et la couverture (lignes, branches, fonctions) ; sort en code 0 même si un fichier manque, en l'indiquant dans le rapport
- [X] T015 Créer `.github/workflows/ci.yml` (déclenché sur `pull_request` vers `main`, `permissions: { contents: read, pull-requests: write }`) : job `ci` avec Node 24, `npm ci`, `npm run check`, `npm test`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, puis, même en cas d'échec (`if: always()`), `npm run test:report` et remplacement du bloc entre `<!-- test-report:start -->` et `<!-- test-report:end -->` dans la description de la PR via `gh pr edit --body-file` ; job `secrets` avec `gitleaks/gitleaks-action` sur tout l'historique
- [X] T016 [P] Créer `src/lib/types.ts` avec les types du [data-model.md](./data-model.md) : `Locale = "fr" | "en" | "es" | "de"` ; `Occasion`, `Relation` (`id`, `labels: Record<Locale, string>`) ; `BudgetBracket` (`minEur` entier, `maxEur` entier ou `null`) ; `Interest` (`id`, `category`, `labels`) ; `Criteria` (`occasionId`, `relationId`, `budgetId`, `interestIds` « De 5 à 10, sans doublon, toutes présentes dans le référentiel », `locale`) ; `GiftIdea` (`rank` « entier 1–6 », `title` « 1 à 80 caractères », `description` « 1 à 300 caractères, 2 phrases au plus », `priceEur`, `matchedInterestIds` « Au moins 1, toutes présentes dans `Criteria.interestIds` », `links`) ; `PurchaseLink` (`merchant: "amazon" | "etsy"`, `url`, `affiliate`) ; `Selection` (`criteria`, `ideas` « De 1 à 6, triées par `rank` », `affiliateDisclosure`) ; `ApiError` (`invalid_criteria`, `no_valid_idea`, `quota_reached`, `rate_limited`, `generation_failed`, `generation_timeout`)
- [X] T017 [P] Créer `src/data/occasions.json` (ids `christmas`, `birthday`, `valentines`, `mothers_day`, `fathers_day`, `wedding`, `birth`, `housewarming`, `thank_you`, `other`), `src/data/relations.json` (ids `partner`, `parent`, `child`, `sibling`, `grandparent`, `friend`, `colleague`, `other`) et `src/data/budgets.json` (`under_20` 0–20, `20_50` 20–50, `50_100` 50–100, `100_200` 100–200, `over_200` 200–`null`), chaque entrée avec ses libellés fr, en, es, de
- [X] T018 [P] Créer `src/data/interests.json` : environ 150 centres d'intérêt répartis en 10 à 12 catégories (musique, sport, jeux, nature et jardin, cuisine et boissons, art et création, lecture et culture, voyage, technologie, bien-être, mode et beauté, maison et déco), chacun avec un `id` stable en anglais `snake_case`, une `category` et des libellés fr, en, es, de ; inclure au minimum `musician` (« Musicien »), `museums` (« Musées »), `gamer` (« Gamer »), `flowers` (« Aime les fleurs »), `cooking` (« Cuisine »), `hiking` (« Randonnée »), utilisés par les tests et les contrats ; ajouter les libellés des catégories dans `src/i18n/*.json`
- [X] T019 [P] Écrire `tests/unit/i18n.test.ts` : les quatre fichiers `src/i18n/*.json` ont exactement les mêmes clés, aucune valeur vide ; chaque entrée de `src/data/*.json` a un libellé non vide dans les 4 langues ; les `id` sont uniques dans chaque fichier ; `interests.json` contient entre 140 et 160 entrées ; une clé plurielle a les mêmes formes dans les 4 langues (SC-008)
- [X] T020 Créer `src/i18n/fr.json`, `en.json`, `es.json`, `de.json` (titre du site, étapes « Étape {n} sur 4 », boutons Suivant, Retour, Voir les idées, libellés des catégories) et `src/lib/i18n.ts` : constante `LOCALES`, `isLocale()`, `getLocaleFromUrl(url)` (`fr` par défaut), `t(locale, key, params?)` typée sur les clés de `fr.json` avec remplacement de `{param}`, et `label(entry, locale)` pour les données de référence ; une clé peut être plurielle (`{ "one": "…", "other": "…" }`), et `t()` choisit la forme avec `new Intl.PluralRules(locale).select(params.count)`
- [X] T021 [P] Créer `src/lib/http.ts` : `json(body, status, init?)` qui renvoie une `Response` JSON UTF-8 avec `Cache-Control: no-store` et sans `Set-Cookie` ; `apiError(code, status, extra?)` pour les corps `{ "error": code, ... }` de [contracts/api.md](./contracts/api.md)
- [X] T022 Créer `src/layouts/Base.astro` : `<html lang={locale}>`, métadonnées viewport, titre traduit, styles système (aucune police ni script tiers), zone `<main>` et `<footer>` avec un emplacement nommé `footer`
- [X] T023 Créer `src/pages/[locale]/index.astro` : renvoie 404 si `locale` n'est pas dans `LOCALES`, sinon rend `Base.astro` avec un conteneur pour l'îlot `GiftFinder` (créé en T050), en passant au client la locale, les données de référence et les textes de la langue

**Checkpoint**: `npm run check` et `npm test` passent, `/fr/` s'affiche, la CI tourne sur la PR et écrit le compte rendu

---

## Phase 3: User Story 1 - Obtenir une sélection d'idées cadeaux via le questionnaire (Priority: P1) 🎯 MVP

**Goal**: un visiteur remplit les 4 étapes, choisit 5 à 10 centres d'intérêt et obtient au plus
6 idées dans sa tranche de budget, avec le quota et les erreurs gérés (FR-001 à FR-014, FR-024,
FR-025, FR-029, FR-030)

**Independent Test**: sur `/fr/`, remplir les 4 étapes avec 5 centres d'intérêt, cliquer sur
« Voir les idées » : 6 idées s'affichent, chacune avec titre, description, prix dans la tranche et
centres d'intérêt, après une seule requête `/api/suggestions` (quickstart V2, V3, V4, V7)

À ce stade, `links` vaut `[]` dans la réponse : les liens d'achat arrivent avec US3 (T062).

### Tests for User Story 1 ⚠️

> **NOTE: écrire ces tests d'abord et vérifier qu'ils échouent**

- [X] T024 [P] [US1] Créer les réponses simulées du modèle dans `tests/fixtures/llm/` au format d'un message de l'API (`stop_reason`, `content: [{ "type": "text", "text": "<JSON>" }]`) pour les critères `birthday`, `friend`, `50_100`, `["musician","gamer","flowers","cooking","hiking"]` : `nominal-fr.json`, `nominal-en.json`, `nominal-es.json`, `nominal-de.json` (6 idées valides), `out-of-budget.json` (2 hors tranche, 4 valides), `duplicates.json` (2 titres identiques à la casse et aux accents près), `unknown-interest.json` (un `matchedInterestIds` absent des critères), `refusal.json` (`stop_reason: "refusal"`), `truncated.json` (`stop_reason: "max_tokens"`), `long-description.json` (une description de 3 phrases)
- [X] T025 [P] [US1] Écrire `tests/unit/criteria.test.ts` : `getCriteriaStatus` renvoie `incomplete` avec le nombre de centres d'intérêt manquants (0 à 4 choisis → 5 à 1 manquants) ou l'étape vide, `ready` pour 5 à 10 centres d'intérêt valides, refus de plus de 10, de doublons et d'id inconnus ; `CriteriaSchema` refuse tout champ inconnu
- [X] T026 [P] [US1] Écrire `tests/unit/interests-search.test.ts` : « mus » et « MUS » renvoient « Musicien » et « Musées » en français ; « musee » trouve « Musées » ; la correspondance se fait au début d'un mot et pas au milieu ; les centres d'intérêt déjà choisis sont exclus ; une recherche sans résultat renvoie une liste vide ; `byCategory` regroupe tout le référentiel
- [X] T027 [P] [US1] Écrire `tests/unit/validate.test.ts` avec les fixtures de T024 : `nominal-fr` donne 6 idées de `rank` 1 à 6 dans l'ordre reçu ; `out-of-budget` donne 4 idées ; `duplicates` garde la première ; `unknown-interest` écarte l'idée ; un `searchQuery` contenant `http` ou `www.` écarte l'idée ; au-delà de 6 idées, seules les 6 premières sont gardées ; `over_200` accepte tout prix ≥ 200 ; `long-description` donne une description réduite à ses 2 premières phrases, et l'idée est gardée
- [X] T028 [P] [US1] Écrire `tests/unit/quota.test.ts` : `periodKeys` renvoie `day:AAAA-MM-JJ` et `month:AAAA-MM` en Europe/Paris, y compris à 23 h 30 UTC le 31 décembre et aux changements d'heure (29 mars et 25 octobre 2026) ; `availableAgainAt` renvoie minuit Europe/Paris du lendemain (quota journalier) ou du 1er du mois suivant (quota mensuel) ; avec `node:sqlite` et `migrations/0001_quota_counter.sql`, la 30ᵉ réservation du jour passe, la 31ᵉ est refusée, un refus mensuel n'incrémente pas le compteur du jour ; un adaptateur `QuotaStore` de test sur `node:sqlite` exécute le lot entre `BEGIN` et `COMMIT` ; quand le jour est à 29 et le mois sous sa limite, la réservation passe et **les deux** compteurs passent à +1 ; avec le mois à 700, aucun compteur ne bouge
- [X] T029 [P] [US1] Écrire `tests/unit/prompt.test.ts` : `buildUserMessage` produit exactement le JSON de [contracts/llm-output.md](./contracts/llm-output.md) (libellés dans la langue, `budget.minEur` et `maxEur`) ; la consigne système ne contient ni « amazon », ni « etsy », ni « affili », ni « http » (principe VI) ; aucun champ hors critères n'est transmis (FR-030)
- [X] T030 [P] [US1] Écrire `tests/unit/claude.test.ts` avec un client SDK simulé : l'appel utilise le modèle `claude-sonnet-5-5`, `max_tokens: 4000`, `output_config.effort: "low"`, `output_config.format`, `fallbacks: "default"` et la bêta `server-side-fallback-2026-07-01`, un client créé avec `maxRetries: 0` et `timeout: 20000` ; les fixtures donnent `ok`, `refusal`, `failed` (`truncated`, JSON invalide, erreur 5xx ou 429) et `timeout` (erreur de délai du SDK)
- [ ] T031 [P] [US1] Écrire `tests/unit/api-suggestions.test.ts` (contrat, IA et quota simulés) : 4 centres d'intérêt, id inconnu, doublon ou champ inconnu → 400 `invalid_criteria` sans réservation de quota ; quota refusé → 429 `quota_reached` avec `availableAgainAt` et modèle non appelé ; `nominal-fr` → 200 au format de [contracts/api.md](./contracts/api.md) ; `refusal` et aucune idée valide → 422 `no_valid_idea` ; `truncated` → 502 `generation_failed` ; délai → 504 `generation_timeout` ; toutes les réponses ont `Cache-Control: no-store` et pas de `Set-Cookie`
- [ ] T032 [P] [US1] Écrire `tests/unit/api-status.test.ts` : `available` et `availableAgainAt: null` sous les quotas ; `limited` avec la bonne date quand le quota journalier ou mensuel est atteint ; aucune réservation consommée ; `Cache-Control: no-store`
- [ ] T033 [P] [US1] Écrire `tests/e2e/helpers/mock-api.ts` (intercepte `**/api/status` et `**/api/suggestions` avec `page.route`, compte les requêtes, permet de renvoyer 200, 429, 422, 502, 504 ou un délai) et `tests/e2e/us1-questionnaire.spec.ts` : « Étape 1 sur 4 » au chargement de `/fr/` ; « Suivant » bloqué avec le message de l'élément manquant ; retour arrière sans perte ; recherche « mus » ; bouton désactivé avec « Encore 1 centre d'intérêt » pour 4 choix ; 6 idées après le clic avec une seule requête ; double clic = une requête ; ajout bloqué au-delà de 10 ; rechargement de la page qui conserve les critères (quickstart V2 à V4)
- [ ] T034 [P] [US1] Écrire `tests/e2e/us1-errors-quota.spec.ts` : `/api/status` « limited » remplace le bouton par le message « Service limité » avec la date, la saisie reste possible ; 429 au clic donne le même message ; 504 et 502 affichent un message et « Réessayer », qui relance une seule requête ; 422 invite à modifier les critères ; la liste précédente reste visible après une erreur ; après un 422, le bouton reste désactivé tant qu'aucun critère n'a changé (quickstart V7)

### Implementation for User Story 1

- [ ] T035 [P] [US1] Créer `src/lib/criteria.ts` : `CriteriaSchema` (Zod `strict()`, `interestIds` « De 5 à 10, sans doublon, toutes présentes dans le référentiel », ids d'occasion, de relation et de budget présents dans `src/data/`, `locale` dans `LOCALES`), `MIN_INTERESTS = 5`, `MAX_INTERESTS = 10`, `getCriteriaStatus(draft, referenceCriteria: Criteria[])` (renvoie `unchanged` si le brouillon est égal à l'un d'eux) qui renvoie `{ status: "incomplete" | "unchanged" | "ready", missingInterests, missingStep }` et `criteriaEqual(a, b)` (même occasion, relation, budget, locale et même ensemble d'`interestIds`, sans tenir compte de l'ordre)
- [ ] T036 [P] [US1] Créer `src/lib/interests-search.ts` : `normalize(s)` (minuscules, accents retirés par `NFD`, espaces réduits), `searchInterests(query, locale, excludeIds)` (correspondance si un mot du libellé commence par la requête, tri alphabétique) et `byCategory(locale, excludeIds)`
- [ ] T037 [P] [US1] Créer `migrations/0001_quota_counter.sql` : table `quota_counter (period_key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0))`
- [ ] T038 [US1] Créer `src/lib/quota.ts` : `periodKeys(now)` en Europe/Paris via `Intl.DateTimeFormat` et `availableAgainAt(now, which)` en ISO 8601 ; une interface `QuotaStore { runBatch(statements: { sql: string; params: unknown[] }[]): Promise<number> }` qui exécute les requêtes dans une seule transaction et renvoie le nombre de lignes modifiées par la dernière ; `d1QuotaStore(db)` qui l'implémente avec `db.batch()` et `results.at(-1).meta.changes` ; `reserve(store, limits, now)` qui envoie (1) `INSERT OR IGNORE INTO quota_counter (period_key, count) VALUES (?1, 0), (?2, 0)` puis (2) `UPDATE quota_counter SET count = count + 1 WHERE period_key IN (?1, ?2) AND (SELECT count FROM quota_counter WHERE period_key = ?1) < ?3 AND (SELECT count FROM quota_counter WHERE period_key = ?2) < ?4`, et renvoie `{ ok: true }` si `changes === 2`, sinon `{ ok: false, availableAgainAt }` ; `getQuotaStatus(store, limits, now)` ; une réservation n'est jamais annulée, même si la génération échoue (research R5). Si T028 montre que SQLite n'évalue pas la condition sur l'état d'avant la mise à jour, changer de requête avant de continuer
- [ ] T039 [P] [US1] Créer `src/lib/generation/schema.ts` : `LlmOutputSchema` en Zod selon [contracts/llm-output.md](./contracts/llm-output.md) (`ideas[]` avec `title`, `description`, `priceEur`, `matchedInterestIds`, `searchQuery`) et sa version JSON Schema pour `output_config.format` ; si l'API refuse certaines contraintes (longueurs), les retirer du schéma envoyé et les garder dans `validate.ts`
- [ ] T040 [P] [US1] Créer `src/lib/generation/prompt.ts` : `SYSTEM_PROMPT` fixe (6 idées distinctes et concrètes, prix en euros dans la tranche, textes et `searchQuery` dans la langue indiquée, description de 2 phrases au plus, aucune marque imposée, aucune URL, rien d'inapproprié pour l'occasion, aucune mention de marchand ni d'affiliation) et `buildUserMessage(criteria)` qui produit le JSON de [contracts/llm-output.md](./contracts/llm-output.md) à partir des libellés de `src/data/`
- [ ] T041 [US1] Créer `src/lib/generation/claude.ts`, seul fichier qui importe `@anthropic-ai/sdk` : `generateIdeas(criteria, { apiKey, client? })` qui appelle `client.beta.messages.create` avec les paramètres de [contracts/llm-output.md](./contracts/llm-output.md) (forme exacte vérifiée dans la doc du SDK, research R3), lit le texte JSON, le valide avec `LlmOutputSchema` et renvoie `{ kind: "ok", raw } | { kind: "refusal" } | { kind: "failed" } | { kind: "timeout" }` sans jamais journaliser les critères ni la réponse
- [ ] T042 [US1] Créer `src/lib/generation/validate.ts` : `validateIdeas(raw, criteria)` qui écarte les idées hors tranche (`minEur ≤ prix ≤ maxEur`, borne haute ignorée si `null`), avec un `matchedInterestIds` vide ou absent des critères, avec un titre en double après `normalize`, ou avec un `searchQuery` vide, de plus de 80 caractères ou contenant une URL ; vérifie `title` « 1 à 80 caractères » et `description` « 1 à 300 caractères » ; réduit `description` à ses 2 premières phrases (découpage sur `.`, `!`, `?` ou `…` suivis d'une espace ou de la fin du texte) au lieu d'écarter l'idée ; garde les 6 premières dans l'ordre reçu et fige `rank` de 1 à n (étape 5 de [contracts/api.md](./contracts/api.md))
- [ ] T043 [US1] Créer `src/pages/api/status.ts` (`GET`, `export const prerender = false`) : lit `QUOTA_DB`, `QUOTA_DAILY` et `QUOTA_MONTHLY` par la méthode d'accès à l'environnement de la version installée de `@astrojs/cloudflare`, renvoie `{ generation, availableAgainAt }` via `json()` sans réserver de quota
- [ ] T044 [US1] Créer `src/pages/api/suggestions.ts` (`POST`, `export const prerender = false`) : étapes 1 à 5 de [contracts/api.md](./contracts/api.md) dans l'ordre (validation `CriteriaSchema` → 400 ; `reserve` → 429 ; `generateIdeas` → 422, 502 ou 504 ; `validateIdeas` → 422 si vide ; réponse 200 `{ ideas, affiliateDisclosure: false }` avec `links: []`, exception temporaire au data-model §4 levée par T063 ; le test T031 attend `links: []` jusqu'à T060) ; dépendances injectables pour les tests de T031
- [ ] T045 [P] [US1] Créer `src/lib/session-state.ts` : `loadState()` et `saveState(state)` sur `sessionStorage` uniquement, clé `gift-finder:v1`, contenu `{ step, draft, selection }`, chaque accès dans un `try/catch` qui revient à l'état vide, contrôle de forme à la lecture (FR-029)
- [ ] T046 [P] [US1] Créer `src/lib/api-client.ts` : `fetchStatus()` et `requestSuggestions(criteria)` qui renvoient `{ ok: true, selection } | { ok: false, error, availableAgainAt? }`, avec `credentials: "omit"` et un abandon côté navigateur à 25 s traité comme `generation_timeout`
- [ ] T047 [P] [US1] Créer `src/components/steps/OccasionStep.svelte`, `RelationStep.svelte` et `BudgetStep.svelte` : groupe de boutons radio dans un `<fieldset>` avec `<legend>` traduit, sélection au clavier, valeur liée au brouillon, message d'erreur relié par `aria-describedby` quand on tente d'avancer sans choix (FR-003 à FR-005, FR-008)
- [ ] T048 [P] [US1] Créer `src/components/InterestPicker.svelte` et `src/components/steps/InterestsStep.svelte` : champ de recherche étiqueté, résultats en liste accessible (`role="listbox"` ou boutons), navigation par catégorie, message « aucun résultat » avec lien vers les catégories, centres d'intérêt choisis en puces retirables, ajout bloqué au-delà de 10 avec un message (FR-006, FR-007)
- [ ] T049 [P] [US1] Créer `src/components/CriteriaStatus.svelte` (clé plurielle : « Encore {count} centre d'intérêt » / « Encore {count} centres d'intérêt », annoncé par `aria-live="polite"`, FR-010), `src/components/QuotaNotice.svelte` (« Service limité, de nouveau disponible {date} », date formatée avec `Intl.DateTimeFormat` dans la langue, FR-024) et `src/components/ErrorNotice.svelte` (message selon `generation_failed`, `generation_timeout` ou `no_valid_idea`, bouton « Réessayer » sauf pour `no_valid_idea`, FR-025)
- [ ] T050 [P] [US1] Créer `src/components/ResultsList.svelte` : liste ordonnée `<ol>` des idées par `rank`, avec titre, description, prix indicatif formaté en euros dans la langue (`Intl.NumberFormat`) et libellés des centres d'intérêt correspondants ; affiche seulement les idées reçues, sans case vide (FR-012)
- [ ] T051 [US1] Créer `src/components/GiftFinder.svelte` : machine à états de [data-model.md](./data-model.md) §8 (`step1` à `step4`, `loading`, `results`, `quota_reached`, `error`), indicateur « Étape {n} sur 4 », boutons Retour et Suivant, bouton « Voir les idées » désactivé selon `getCriteriaStatus` et pendant `loading`, appel de `fetchStatus` au montage, une seule requête en vol, sauvegarde via `session-state.ts` à chaque changement, focus déplacé sur le titre de l'étape ou des résultats ; après une réponse 422 `no_valid_idea`, mémoriser les critères envoyés dans `lastRejectedCriteria` et appeler `getCriteriaStatus(draft, [selection?.criteria, lastRejectedCriteria].filter(Boolean))`, pour qu'un nouvel essai identique ne consomme pas de quota ; l'intégrer dans `src/pages/[locale]/index.astro` avec `client:load`
- [ ] T052 [US1] Ajouter dans `src/i18n/{fr,en,es,de}.json` tous les textes de US1 (étapes, erreurs de saisie, recherche, limites, chargement, quota, erreurs, résultats) puis vérifier que T019 et les tests T024 à T034 passent

**Checkpoint**: le parcours complet fonctionne en français avec l'IA simulée ; MVP démontrable

---

## Phase 4: User Story 2 - Ajuster les critères depuis les résultats sans rafraîchissement involontaire (Priority: P2)

**Goal**: sur les résultats, tous les critères restent modifiables ; la liste ne change qu'à la
validation explicite (FR-015 à FR-019, SC-007)

**Independent Test**: depuis une liste affichée, changer le budget et un centre d'intérêt sans
valider (liste et compteur de requêtes inchangés, signal « critères modifiés »), puis valider
(une seule requête, liste remplacée) (quickstart V5)

### Tests for User Story 2 ⚠️

- [ ] T053 [P] [US2] Compléter `tests/unit/criteria.test.ts` : `unchanged` quand le brouillon est égal aux critères affichés (y compris avec les centres d'intérêt dans un autre ordre), `ready` dès qu'un critère ou la locale diffère, `incomplete` prioritaire sur `unchanged` sous 5 centres d'intérêt ; `unchanged` aussi quand le brouillon est égal au deuxième critère de référence
- [ ] T054 [P] [US2] Écrire `tests/e2e/us2-edit-criteria.spec.ts` : modifications sans validation = 0 requête et signal visible ; retour aux critères d'origine = signal masqué et bouton désactivé ; validation = 1 requête et liste remplacée ; moins de 5 centres d'intérêt = bouton désactivé avec « Encore {n} centre(s) d'intérêt » ; double clic sur « Mettre à jour » = 1 requête

### Implementation for User Story 2

- [ ] T055 [P] [US2] Créer `src/components/CriteriaPanel.svelte` : sur la page des résultats, réutilise `OccasionStep`, `RelationStep`, `BudgetStep` et `InterestPicker` en version compacte pour modifier tous les critères sans changer d'écran (FR-015)
- [ ] T056 [P] [US2] Créer `src/components/StaleNotice.svelte` : message « Vos critères ont changé : mettez à jour pour voir de nouvelles idées », annoncé par `aria-live="polite"` (FR-017)
- [ ] T057 [US2] Étendre `src/components/GiftFinder.svelte` : état `results_dirty`, transitions `results ↔ results_dirty` selon `criteriaEqual`, bouton « Mettre à jour les idées » désactivé si `unchanged`, `incomplete` ou `loading`, une validation = une requête qui remplace la sélection seulement en cas de succès (FR-016, FR-018, FR-019) ; ajouter les textes dans les 4 fichiers `src/i18n/`

**Checkpoint**: US1 et US2 fonctionnent ensemble ; aucune génération sans clic

---

## Phase 5: User Story 3 - Ouvrir un lien d'achat pour une idée (Priority: P3)

**Goal**: chaque idée a un lien de recherche Amazon (pays de la langue) et Etsy ; au plus
2 liens affiliés, signalés, ajoutés après le classement (FR-020 à FR-023, SC-010, SC-011)

**Independent Test**: avec la même réponse simulée, comparer la sélection avec et sans
`AMAZON_TAG_FR` : ordre identique, au plus 2 « lien affilié », mention légale seulement avec
identifiant (quickstart V6)

### Tests for User Story 3 ⚠️

- [ ] T058 [P] [US3] Écrire `tests/unit/links.test.ts` : `fr → https://www.amazon.fr/s?k=`, `de → amazon.de`, `es → amazon.es`, `en → amazon.co.uk` ; Etsy `https://www.etsy.com/search?q=` ; requête encodée avec `URLSearchParams` (ex. « pédale delay guitare » → `p%C3%A9dale+delay+guitare`) ; `&tag=` seulement sur les liens Amazon des idées `rank` 1 et 2 et seulement si le tag du pays est défini et non vide ; exactement 2 liens par idée, Amazon puis Etsy
- [ ] T059 [P] [US3] Écrire `tests/unit/neutrality.test.ts` : pour chaque fixture `nominal-*` et `out-of-budget`, la liste des titres et des `rank` est strictement identique avec et sans les quatre `AMAZON_TAG_*` ; au plus 2 liens `affiliate: true` par sélection ; `affiliateDisclosure` vaut `true` si et seulement si un lien est affilié ; `buildLinks` ne modifie pas le tableau reçu (SC-010, SC-011)
- [ ] T060 [P] [US3] Compléter `tests/unit/api-suggestions.test.ts` : la réponse 200 contient 2 liens par idée ; avec `AMAZON_TAG_FR` défini, l'ordre des idées est identique à celui obtenu sans tag
- [ ] T061 [P] [US3] Écrire `tests/e2e/us3-links.spec.ts` : chaque idée a un lien Amazon et un lien Etsy avec `target="_blank"` et `rel="noopener noreferrer"` (plus `sponsored` si affilié) ; les liens affiliés portent la mention « lien affilié » ; sans affiliation, aucune mention n'apparaît

### Implementation for User Story 3

- [ ] T062 [US3] Créer `src/lib/links.ts` : `AMAZON_HOSTS` (`fr → www.amazon.fr`, `de → www.amazon.de`, `es → www.amazon.es`, `en → www.amazon.co.uk`), `amazonTagFor(env, locale)` (`en → AMAZON_TAG_UK`), et `buildLinks(rankedIdeas, locale, tag)` qui renvoie une **nouvelle** liste dans le même ordre, avec les liens Amazon puis Etsy construits à partir de `searchQuery`, et l'affiliation ajoutée seulement aux idées `rank` 1 et 2 (étapes 6 et 7 de [contracts/api.md](./contracts/api.md))
- [ ] T063 [US3] Brancher `buildLinks` dans `src/pages/api/suggestions.ts` après `validateIdeas`, calculer `affiliateDisclosure`, et retirer `searchQuery` de la réponse au navigateur
- [ ] T064 [P] [US3] Étendre `src/components/ResultsList.svelte` : boutons-liens « Chercher sur Amazon » et « Chercher sur Etsy » par idée, attributs de T061, badge « lien affilié » visible à côté de chaque lien affilié (FR-023)
- [ ] T065 [US3] Afficher la mention légale Amazon Partenaires dans le `footer` de `src/layouts/Base.astro` seulement si le tag du pays de la locale est configuré, avec les textes officiels dans `src/i18n/` : fr « En tant que Partenaire Amazon, je réalise un bénéfice sur les achats remplissant les conditions requises. », de « Als Amazon-Partner verdiene ich an qualifizierten Verkäufen. », es « En calidad de Afiliado de Amazon, obtengo ingresos por las compras adscritas que cumplen los requisitos aplicables. », en « As an Amazon Associate I earn from qualifying purchases. » ; ajouter les textes des liens et du badge dans les 4 langues

**Checkpoint**: les liens fonctionnent ; la neutralité est prouvée par un test automatique

---

## Phase 6: User Story 4 - Utiliser le site dans sa langue (Priority: P3)

**Goal**: tout le parcours en fr, en, es ou de, français par défaut, sans cookie ; un changement de
langue ne régénère rien (FR-026 à FR-028, SC-008)

**Independent Test**: parcourir le questionnaire en `/en/`, `/es/` et `/de/` : tous les textes,
centres d'intérêt et idées sont dans la langue ; changer de langue sur les résultats conserve les
critères et propose de valider (quickstart V1, V8)

### Tests for User Story 4 ⚠️

- [ ] T066 [P] [US4] Écrire `tests/unit/locale-redirect.test.ts` : `pickLocale("de-DE,de;q=0.9,en;q=0.8") → "de"`, `pickLocale("pt-BR") → "fr"`, en-tête absent → `"fr"`, poids `q` respectés ; la réponse de `/` est une redirection 302 sans `Set-Cookie`
- [ ] T067 [P] [US4] Écrire `tests/e2e/us4-languages.spec.ts` : `/` sans `Accept-Language` reconnu → `/fr/` ; pour `/en/`, `/es/` et `/de/`, `<html lang>` correct, aucun texte français résiduel sur les 4 étapes et les résultats (fixtures `nominal-en`, `nominal-es`, `nominal-de`) ; changer de langue depuis les résultats conserve les critères, ne lance aucune requête et affiche le signal de T056 ; la requête suivante porte la nouvelle `locale`

### Implementation for User Story 4

- [ ] T068 [US4] Créer `src/lib/locale-redirect.ts` (`pickLocale(acceptLanguage)`) et créer `src/pages/index.astro` pour rediriger en 302 vers `/{locale}/` selon `Accept-Language`, `fr` par défaut, sans cookie ; passer `redirectToDefaultLocale` à `false` dans `astro.config.mjs`
- [ ] T069 [P] [US4] Créer `src/components/LanguageSwitcher.astro` : liens vers `/fr/`, `/en/`, `/es/`, `/de/` avec le nom de chaque langue dans sa propre langue, attributs `hreflang` et `lang`, `aria-current` sur la langue active ; l'intégrer dans l'en-tête de `src/layouts/Base.astro`
- [ ] T070 [US4] Dans `src/components/GiftFinder.svelte`, au chargement, si la sélection restaurée depuis `sessionStorage` a une `locale` différente de celle de l'URL, mettre à jour `draft.locale` et passer en `results_dirty` sans requête (FR-028) ; relire les traductions en, es et de de `src/i18n/` et `src/data/` pour qu'elles soient naturelles, pas littérales

**Checkpoint**: toutes les user stories fonctionnent, dans les 4 langues

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: accessibilité, confidentialité, mise en ligne et validation finale

- [ ] T071 [P] Écrire `tests/e2e/a11y.spec.ts` : analyse `@axe-core/playwright` (règles `wcag2a`, `wcag2aa`) sans aucune violation sur les 4 étapes, les résultats, le message de quota et le message d'erreur, dans les 4 langues et sur les projets bureau et mobile (ISO 9241-11, principe VII)
- [ ] T072 [P] Écrire `tests/e2e/keyboard.spec.ts` : parcours complet jusqu'aux résultats au clavier seul (Tab, Maj+Tab, Entrée, Espace, flèches), focus toujours visible, focus déplacé sur le titre à chaque changement d'étape et à l'arrivée des résultats
- [ ] T073 [P] Écrire `tests/e2e/privacy.spec.ts` : après un parcours complet, `context.cookies()` est vide, `localStorage` est vide, aucune réponse n'a d'en-tête `Set-Cookie`, aucune requête ne part vers un autre domaine que celui du site ; après fermeture du contexte et réouverture, aucun critère n'est restauré (SC-009)
- [ ] T074 Mettre à jour la documentation de la spec : dans `specs/001-questionnaire-idees-cadeaux/plan.md`, la ligne du principe I du Constitution Check (le dépôt git existe désormais), la mention « tasks.md pas encore créé », et l'arborescence (ajouter `src/lib/{types,http,api-client,locale-redirect}.ts`, `src/components/{CriteriaPanel,StaleNotice}.svelte`, `src/components/LanguageSwitcher.astro`, `scripts/test-report.mjs`, `.githooks/`) ; dans `research.md` R15, retirer le prérequis « pas encore un dépôt git » ; passer le Constitution Check de `plan.md` en v2.2.0 une fois la PR de la constitution fusionnée et `main` fusionnée dans la branche
- [ ] T075 **Point de contrôle bloquant** (principe VIII), avant tout appel réel par une autre personne que le développeur : demander la ZDR à l'équipe commerciale d'Anthropic (https://claude.com/contact-sales) pour l'organisation de la clé de production (research R12) ; dans la même demande, faire confirmer l'éligibilité du repli serveur (`fallbacks`, bêta `server-side-fallback-2026-07-01`) et de son modèle de repli, absents du tableau d'éligibilité ; s'il n'est pas couvert, retirer `fallbacks` et la bêta de `src/lib/generation/claude.ts` et de `tests/unit/claude.test.ts` ; vérifier que l'exception de conservation (jusqu'à 2 ans pour les contenus signalés, ou imposée par la loi) est documentée dans `plan.md`, avec sa source et sa durée, comme l'exige le principe VIII v2.2.0 (PR de la constitution fusionnée au préalable) ; noter la réponse, sa date et la date d'activation dans `research.md` R12 et dans `specs/001-questionnaire-idees-cadeaux/launch-checklist.md`. Si la ZDR est refusée, **arrêter** et choisir : modifier la constitution par une PR dédiée, ou changer de fournisseur (retour à `/speckit-plan`). Bloque T077 à T080
- [ ] T076 [P] Anti-abus compatible avec `workers.dev` (research R11) : ajouter dans `wrangler.jsonc` une liaison `ratelimits` `SUGGESTIONS_LIMITER` (5 requêtes par 10 s) et son type dans `src/env.d.ts` ; dans `src/pages/api/suggestions.ts`, l'appeler juste après la validation et avant la réservation de quota, avec comme clé l'en-tête `CF-Connecting-IP`, jamais écrite ni journalisée ; en cas de refus, répondre 429 `{ "error": "rate_limited" }` sans consommer de quota ; ajouter le cas dans `tests/unit/api-suggestions.test.ts`, et le message « Trop de demandes, réessayez dans quelques secondes » avec « Réessayer » dans `src/components/ErrorNotice.svelte` et les 4 fichiers `src/i18n/` ; vérifier dans la documentation Cloudflare que la liaison fonctionne sur `workers.dev` et que ses compteurs sont éphémères
- [ ] T077 Déploiement de prévisualisation (URL `workers.dev` non diffusée, aucun secret dans le commit) : `npx wrangler d1 create quota` puis reporter le `database_id` dans `wrangler.jsonc` ; `npx wrangler d1 migrations apply quota --remote` ; `npx wrangler secret put ANTHROPIC_API_KEY` ; limite de dépense Anthropic à 17 $ par mois et alerte à 12 $ ; vérifier `"observability": { "enabled": false }` ; `npm run build` puis `npx wrangler deploy` ; cocher chaque point dans `specs/001-questionnaire-idees-cadeaux/launch-checklist.md`
- [ ] T078 Dérouler les scénarios V1 à V8 de [quickstart.md](./quickstart.md) en local, puis sur la prévisualisation l'essai V9 (une recherche par langue) et la mesure de SC-005 : 20 recherches réelles aux critères variés (coût ≈ 0,42 €), avec le temps de chaque réponse et le 95e percentile (objectif < 10 s) notés dans `specs/001-questionnaire-idees-cadeaux/launch-checklist.md` ; mesurer la taille de la consigne système et activer le prompt caching seulement si elle dépasse le minimum cachable (research R4)
- [ ] T079 Mener les tests utilisateurs du protocole de [quickstart.md](./quickstart.md) sur la prévisualisation (au moins 5 participants par langue) et consigner les résultats SC-001 à SC-004, sans donnée identifiante, dans `specs/001-questionnaire-idees-cadeaux/usability-results.md`
- [ ] T080 Ouverture publique, seulement si `specs/001-questionnaire-idees-cadeaux/launch-checklist.md` est entièrement coché (T075 à T079, SC-001 à SC-005 atteints) : diffuser l'URL ; quand le domaine sera acheté (research R16), ajouter la règle de limitation de débit Cloudflare au niveau du domaine

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : T001 → T011 d'abord (`.gitignore` et scan de secrets actifs avant tout
  autre commit), puis T002 → T003 → T004 et T005 ; T006 à T010 et T012 en parallèle ; T013 à
  tout moment
- **Foundational (Phase 2)** : dépend de la phase 1 ; bloque toutes les user stories
- **US1 (Phase 3)** : dépend de la phase 2 ; c'est le MVP
- **US2 (Phase 4)** : dépend de US1 (elle étend les résultats et `GiftFinder.svelte`)
- **US3 (Phase 5)** : dépend de US1 (réponse 200 et `ResultsList.svelte`) ; indépendante de US2
- **US4 (Phase 6)** : dépend de US1 ; T070 utilise l'état `results_dirty` de US2 (T057)
- **Polish (Phase 7)** : dépend des user stories livrées ; T075 bloque T077 à T080 ; ordre
  T077 → T078 → T079 → T080 ; T076 en parallèle de T075

### User Story Dependencies

```text
Setup → Foundational → US1 ─┬─▶ US2 ─┐
                            ├─▶ US3 ─┼─▶ Polish
                            └─▶ US4 ◀┘ (T070 après T057)
```

### Within Each User Story

- Tests écrits et en échec avant l'implémentation
- `src/lib/` (logique pure) avant `src/pages/api/` (points d'accès) avant `src/components/`
  (interface)
- Dans US1 : T038 avant T043 et T044 ; T039 et T040 avant T041 ; T041 et T042 avant T044 ;
  T045 à T050 avant T051

### Parallel Opportunities

- Phase 1 : T006 à T010 et T012
- Phase 2 : T016 à T019 et T021
- US1 : tous les tests T024 à T034 ; puis T035 à T037, T039, T040, T045 à T050
- US3 et US4 peuvent avancer en parallèle après US1, sauf T070
- Phase 7 : T071 à T073, et T076 en parallèle de T075

---

## Parallel Example: User Story 1

```bash
# Tous les tests de US1 en même temps :
Task: "Écrire tests/unit/criteria.test.ts"
Task: "Écrire tests/unit/interests-search.test.ts"
Task: "Écrire tests/unit/validate.test.ts"
Task: "Écrire tests/unit/quota.test.ts"
Task: "Écrire tests/unit/api-suggestions.test.ts"

# Puis la logique pure, en même temps :
Task: "Créer src/lib/criteria.ts"
Task: "Créer src/lib/interests-search.ts"
Task: "Créer src/lib/generation/schema.ts"
Task: "Créer src/lib/generation/prompt.ts"

# Puis les composants, en même temps :
Task: "Créer les étapes Occasion, Relation et Budget dans src/components/steps/"
Task: "Créer src/components/InterestPicker.svelte et InterestsStep.svelte"
Task: "Créer src/components/ResultsList.svelte"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 : Setup
2. Phase 2 : Foundational (bloque tout le reste)
3. Phase 3 : US1, avec quota et erreurs (sans eux, la mise en ligne violerait les principes V
   et VII)
4. **STOP et VALIDATE** : quickstart V2 à V4 et V7, puis V9 avec une vraie clé
5. Ouvrir la PR : la CI écrit le compte rendu, la fusion dans `main` attend des tests au vert

### Incremental Delivery

1. Setup + Foundational → base prête, CI active
2. US1 → MVP en français (liens d'achat absents)
3. US2 → affinage des critères sans coût caché
4. US3 → liens Amazon et Etsy, neutralité prouvée
5. US4 → 4 langues complètes et sélecteur de langue
6. Polish → accessibilité, confidentialité, mise en ligne

Comme la constitution prévoit une branche par fonctionnalité, chaque incrément peut faire l'objet
d'une PR séparée vers `main`, ou toutes les phases peuvent rester sur
`001-questionnaire-idees-cadeaux` avec une seule PR finale. Dans les deux cas, un commit par tâche.

---

## Notes

- [P] = fichiers différents, aucune dépendance en attente
- Le label [Story] relie chaque tâche à sa user story
- Vérifier que les tests échouent avant d'implémenter
- S'arrêter à chaque checkpoint pour valider la story seule
- À éviter : tâches vagues, deux tâches [P] sur le même fichier, dépendances entre stories qui
  cassent leur indépendance
