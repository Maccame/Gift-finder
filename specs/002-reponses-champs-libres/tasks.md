---

description: "Liste des tâches des réponses en champ libre dans le questionnaire"
---

# Tasks: Réponses en champ libre dans le questionnaire

**Input**: documents de conception de `specs/002-reponses-champs-libres/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md),
[contracts/llm-input.md](./contracts/llm-input.md), [quickstart.md](./quickstart.md)

**Tests**: obligatoires (constitution v4.0.0, principes IV et IX). Dans chaque phase, les tests
sont écrits d'abord et doivent échouer avant l'implémentation. L'IA est toujours simulée ; aucun
test n'appelle l'API payante.

**Organization**: les tâches sont regroupées par user story pour que chacune puisse être
implémentée, testée et livrée seule.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : peut être faite en parallèle (fichiers différents, aucune dépendance en attente)
- **[Story]** : user story concernée (US1 à US3)
- Chaque description donne le chemin exact du fichier

## Règles valables pour toutes les tâches

- **Un commit à la fin de chaque tâche** (principe I), message au format
  `type(portée): description (Txxx)`, par exemple `feat(filtre): retrait des segments (T012)`.
- **Aucun texte visible codé en dur** (principe III) : toute clé ajoutée l'est dans les **quatre**
  fichiers `src/i18n/{fr,en,es,de}.json` dans le même commit ; `tests/unit/i18n.test.ts` échoue
  sinon.
- **Aucune journalisation** (principe IX) : aucun `console.*` dans `src/` ; aucune réponse
  d'erreur ne contient le texte libre ; aucune écriture du texte en D1, en cache ou en file
  d'attente.
- **Phrases inventées uniquement** dans les tests et le corpus, jamais un texte réel (research R6).
- **Tests Playwright qui saisissent du texte libre** : `test.use({ trace: "off", screenshot: "off", video: "off" })`
  en tête de fichier (research R6, point 6).
- Avant de modifier la requête vers l'API Claude (T015), vérifier la forme des paramètres dans la
  documentation du SDK `@anthropic-ai/sdk` (skill `claude-api`), sans la deviner.

## Path Conventions

Un seul projet Astro à la racine du dépôt (voir [plan.md](./plan.md), Project Structure) :
`src/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: aligner la branche sur `main` et la configuration du Worker

- [X] T001 Vérifier que la PR #13 (constitution v4.0.0, branche `constitution-v4-champs-libres`) est fusionnée dans `main`, puis fusionner `main` dans `002-constitution-champs-libres` ; contrôler que `.specify/memory/constitution.md` affiche la version 4.0.0
- [ ] T002 Dans `wrangler.jsonc` : passer `"observability": { "enabled": false }` et remplacer le commentaire « TEMPORAIRE » par « désactivé (principe IX, 2026-11-27) » ; ajouter `"PRIVACY_CONTACT_EMAIL": "find-my-kdo@proton.me"` dans `vars` avec le commentaire « adresse publique de contact RGPD, temporaire jusqu'au domaine (research R8) »
- [ ] T003 [P] Dans `src/env.d.ts`, ajouter `PRIVACY_CONTACT_EMAIL?: string` à `Cloudflare.Env`
- [ ] T004 [P] Dans `tests/unit/stubs/cloudflare-workers.ts`, exposer `PRIVACY_CONTACT_EMAIL: "contact@example.invalid"` dans l'objet `env` simulé, modifiable par test

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: normalisation du texte, filtre de données sensibles et critères étendus, utilisés par
les trois user stories

**⚠️ CRITICAL**: aucune user story ne peut commencer avant la fin de cette phase

### Tests (écrits d'abord, doivent échouer)

- [ ] T005 [P] Créer `tests/unit/about-text.test.ts` : `normalizeAboutText` remplace retours à la ligne et tabulations par une espace, réduit les espaces multiples, retire les espaces de début et de fin ; `isAboutTextTooLong` vrai au-delà de 150 unités (« 0 à 150 unités (`maxlength`) ; au-delà → 400 côté serveur », data-model §1) ; texte d'espaces seuls → `""` ; un emoji compte pour 2
- [ ] T006 [P] Créer le corpus `tests/fixtures/sensitive-corpus/fr.json`, `en.json`, `es.json`, `de.json` au format de data-model §5 : dans chaque langue, au moins 5 phrases `detect` par catégorie (`health`, `ethnic_origin`, `political_opinion`, `religious_belief`, `trade_union`, `genetic_biometric`, `sex_life_orientation`, `contact`), chacune avec `categories` et `expected` (texte après retrait, ex. « fan de jazz, elle est diabétique » → « fan de jazz ») ; au moins 13 phrases `neutral` par langue (52 au total), dont des mentions de grossesse, des noms de fêtes et de rites religieux (communion, baptême, Aïd, Hanoukka, bar-mitzvah), les occasions et relations de la 001, et des faux amis (« livres de cuisine santé ») ; au moins une phrase `detect` par langue qui associe une fête et une déclaration d'appartenance (« pour l'Aïd, il est très pratiquant » → « pour l'Aïd ») ; phrases inventées uniquement
- [ ] T007 Créer `tests/unit/sensitive-filter.test.ts` à partir du corpus de T006 : 100 % des phrases `detect` donnent exactement `categories` et `expected` (SC-005) ; au plus 5 % des phrases `neutral` ont des catégories non vides, avec la liste des faux positifs affichée en cas d'échec (SC-006) ; détection insensible aux majuscules et aux accents ; un texte français contenant un terme allemand est détecté (listes des quatre langues) ; texte entièrement détecté → `""` ; le résultat n'a aucun champ qui contienne le passage retiré ; fonction pure (deux appels identiques, même résultat)
- [ ] T008 [P] Compléter `tests/unit/criteria.test.ts` : `aboutText` facultatif dans `CriteriaSchema`, refusé au-delà de 150 unités après normalisation ; `criteriaEqual` faux si `aboutText` diffère, vrai si seuls les espaces diffèrent ; `aboutText` n'entre pas dans le minimum de 5 centres d'intérêt ; `toCriteria` omet `aboutText` vide
- [ ] T009 [P] Compléter `tests/unit/session-state.test.ts` : `Draft.aboutText` (`""` par défaut) est écrit et relu dans `sessionStorage` ; un état enregistré sans `aboutText` (format 001) est relu avec `aboutText: ""`

### Implémentation

- [ ] T010 [P] Créer `src/lib/about-text.ts` : `ABOUT_TEXT_MAX = 150`, `normalizeAboutText(text: string): string` et `isAboutTextTooLong(text: string): boolean` (longueur en unités UTF-16, comme `maxlength`, research R9) ; fait passer T005
- [ ] T011 [P] Créer `src/data/sensitive-terms.json` au format de data-model §3 (`version: 1`, `categories` pour les 8 catégories avec `terms` dans les 4 langues, `patterns` pour `contact` : e-mail et téléphone d'au moins 8 chiffres avec espaces, points, tirets ou `+`, `exclusions` par langue : occasions et relations de `src/data/occasions.json` et `src/data/relations.json`, fêtes et rites religieux, mentions de grossesse) ; la liste `health` ne contient aucun terme de grossesse et `religious_belief` aucun nom de fête ou de rite (FR-014)
- [ ] T012 Dans `src/lib/types.ts`, ajouter `aboutText?: string` à `Criteria` et le type `SensitiveCategory` (8 valeurs de data-model §3) ; créer `src/lib/sensitive-filter.ts` : `filterSensitive(text: string): { text: string; categories: SensitiveCategory[] }`, normalisation NFD sans accents et minuscules, exclusions retirées avant la détection, correspondance sur mots entiers dans les listes des quatre langues, segments découpés sur `. , ; : ! ? ¡ ¿`, segments détectés retirés avec leur séparateur, espaces réduits, reste fait de ponctuation seule → `""`, catégories sans doublon dans l'ordre de FR-011 (research R2, R3) ; ajuster `sensitive-terms.json` jusqu'à ce que T007 passe
- [ ] T013 Dans `src/lib/criteria.ts`, ajouter `aboutText` à `CriteriaSchema` (facultatif, normalisé par `normalizeAboutText`, refusé si `isAboutTextTooLong`), à `Draft` (`aboutText: string`, `""` dans `emptyDraft`), à `toCriteria` (omis si vide) et à `criteriaEqual` (comparaison après normalisation) ; fait passer T008
- [ ] T014 Dans `src/lib/session-state.ts`, accepter `aboutText` dans `isDraft` (chaîne, absent → `""`) sans changer `STORAGE_KEY` ; fait passer T009

**Checkpoint** : filtre et critères prêts, corpus au vert ; les user stories peuvent commencer

---

## Phase 3: User Story 1 - Préciser sa réponse par quelques mots libres (Priority: P1) 🎯 MVP

**Goal**: un champ facultatif « À propos de la personne » à l'étape des centres d'intérêt, pris en
compte par le modèle, modifiable depuis les résultats

**Independent Test**: remplir le questionnaire avec et sans texte libre ; le texte est envoyé au
modèle simulé ; sans texte, le parcours et le message au modèle sont identiques à la 001

### Tests (écrits d'abord, doivent échouer)

- [ ] T015 [P] [US1] Compléter `tests/unit/prompt.test.ts` : sans `aboutText`, `buildUserMessage` rend exactement la même chaîne qu'en 001 ; avec `aboutText`, la clé `aboutRecipient` contient le texte ; `SYSTEM_PROMPT` contient la phrase de [contracts/llm-input.md](./contracts/llm-input.md)
- [ ] T016 [P] [US1] Compléter `tests/unit/api-suggestions.test.ts` : `aboutText` transmis au `generate` simulé après normalisation ; `aboutText` de plus de 150 unités → 400 `invalid_criteria` sans réserver de quota ; `aboutText` vide après normalisation → absent des critères ; réponse 200 avec `appliedAboutText` (`null` sans texte) et `removedCategories: []` ; `aboutText` alors que `PRIVACY_CONTACT_EMAIL` est vide → 400
- [ ] T017 [P] [US1] Compléter `tests/unit/api-status.test.ts` : `freeText: true` si `PRIVACY_CONTACT_EMAIL` est renseignée, `false` sinon
- [ ] T018 [P] [US1] Compléter `tests/unit/neutrality.test.ts` : pour au moins 5 jeux de critères avec `aboutText`, l'ordre des idées est identique avec et sans identifiant d'affiliation (SC-011)
- [ ] T019 [P] [US1] Compléter `tests/e2e/helpers/mock-api.ts` : `/api/status` simulé renvoie `freeText` (vrai par défaut, configurable) ; `/api/suggestions` simulé renvoie `appliedAboutText` et `removedCategories` (configurables) et expose le dernier corps reçu
- [ ] T020 [US1] Créer `tests/e2e/us-free-text.spec.ts` (avec `test.use({ trace: "off", screenshot: "off", video: "off" })`) pour US1 : champ « À propos de la personne » sous les centres d'intérêt ; champ vide → sélection obtenue sans message ni étape de plus et corps sans `aboutText` ; « passionnée de céramique » → présent dans le corps envoyé ; au-delà de 150 caractères la saisie s'arrête, compteur à 0 ; collage d'un texte trop long → 150 caractères gardés et mention « texte coupé » ; modification du champ depuis les résultats → aucune génération, signal de critères modifiés, bouton de validation actif ; `freeText: false` → aucun champ affiché ; tests en mobile et ordinateur

### Implémentation

- [ ] T021 [US1] Dans `src/lib/generation/prompt.ts`, ajouter `aboutRecipient` au message utilisateur seulement si `criteria.aboutText` est non vide, et ajouter à la fin de `SYSTEM_PROMPT` la phrase exacte de [contracts/llm-input.md](./contracts/llm-input.md) ; vérifier avec le skill `claude-api` que `buildRequest` dans `src/lib/generation/claude.ts` n'a pas à changer ; fait passer T015
- [ ] T022 [US1] Dans `src/pages/api/status.ts`, ajouter `freeText: Boolean(env.PRIVACY_CONTACT_EMAIL)` à la réponse (injecté par `StatusDeps` pour les tests) ; fait passer T017
- [ ] T023 [US1] Dans `src/pages/api/suggestions.ts`, ajouter `freeTextEnabled: boolean` à `SuggestionsDeps` ; refuser `aboutText` (400) si `freeTextEnabled` est faux ; ajouter `appliedAboutText` et `removedCategories` à la réponse 200 dans `toSelectionBody` (`src/lib/links.ts`) ou juste après ; aucune réponse d'erreur ne contient le texte ([contracts/api.md](./contracts/api.md)) ; fait passer T016 et T018
- [ ] T024 [US1] Ajouter dans `src/i18n/{fr,en,es,de}.json` les clés `about.label` (« À propos de la personne »), `about.placeholder` (exemple de saisie), `about.optional` (« facultatif »), `about.counter` (caractères restants, avec pluriel), `about.truncated` (« texte coupé à 150 caractères »)
- [ ] T025 [US1] Créer `src/components/AboutField.svelte` : `<textarea maxlength="150">` avec libellé, mention facultatif et exemple ; compteur lié par `aria-describedby`, dans une zone `aria-live="polite"` activée à partir de 20 caractères restants (FR-004) ; au collage, troncature à 150 et message `about.truncated` ; chaque frappe met à jour `draft.aboutText`
- [ ] T026 [US1] Intégrer `AboutField` sous le choix des centres d'intérêt dans `src/components/steps/InterestsStep.svelte` et dans `src/components/CriteriaPanel.svelte` (FR-009) ; dans `src/components/GiftFinder.svelte`, lire `freeText` depuis `/api/status` (via `src/lib/api-client.ts`) et ne rendre le champ que s'il vaut `true` ; envoyer `aboutText` normalisé dans la requête ; fait passer T020

**Checkpoint** : US1 livrable seule (avec la garantie serveur de US2 déjà en place si US2 est faite ensuite)

---

## Phase 4: User Story 2 - Être averti et protégé contre la saisie de données sensibles (Priority: P1)

**Goal**: avertissement article 9 avant le champ, message pendant la saisie, retrait au clic, et
garantie côté serveur pour toute demande

**Independent Test**: les phrases du corpus `detect` ne sont jamais transmises au modèle, depuis
l'interface comme par une requête directe ; les phrases `neutral` passent

### Tests (écrits d'abord, doivent échouer)

- [ ] T027 [P] [US2] Compléter `tests/unit/api-suggestions.test.ts` : pour chaque phrase `detect` du corpus (4 langues), une requête directe transmet au `generate` simulé exactement `expected` (ou aucun `aboutText` si `expected` est vide) et renvoie `removedCategories` égal à `categories` ; le filtre passe avant la réservation du quota ; `buildRequest` ne contient jamais le passage retiré
- [ ] T028 [P] [US2] Créer `tests/unit/no-log.test.ts` : parcourir tous les fichiers de `src/` et échouer si l'un contient `console.` ; exécuter `handleSuggestions` avec un texte marqueur inventé (ex. `MARQUEUR-7f3a`) dans chaque scénario (200, 400 trop long, 400 champ désactivé, 422, 429 quota, 429 débit, 502, 504, retrait par le filtre), espionner `console.log`, `info`, `warn`, `error`, `debug` et vérifier qu'aucun n'est appelé et que le marqueur est absent de tout corps de réponse d'erreur (SC-007)
- [ ] T029 [US2] Ajouter à `tests/e2e/us-free-text.spec.ts` les scénarios US2 : avertissement visible avant le champ sans action, nommant les 7 catégories de l'article 9 ; saisie de « elle sort d'une chimiothérapie » puis pause → message « santé » sans modification du texte ; reformulation → message disparu ; « fan de jazz, elle est diabétique » puis clic → champ réduit à « fan de jazz », message de retrait sans citer le passage, corps envoyé identique au champ ; texte entièrement détecté → champ vidé, message, génération sans `aboutText` ; « aime le jardinage et les romans policiers » → aucun message ; réponse simulée avec `removedCategories` non vide alors que le navigateur n'a rien retiré → champ remplacé par `appliedAboutText` et message affiché ; message annoncé par une zone `aria-live="polite"`

### Implémentation

- [ ] T030 [US2] Dans `src/pages/api/suggestions.ts`, après la limitation de débit et avant la réservation du quota, appliquer `filterSensitive` à `criteria.aboutText`, remplacer le texte par le résultat (supprimer la clé s'il est vide) et garder les catégories pour `removedCategories` ([contracts/api.md](./contracts/api.md), étape 1 ter) ; aucun `console.*`, aucune exception non rattrapée ; fait passer T027 et T028
- [ ] T031 [US2] Ajouter dans `src/i18n/{fr,en,es,de}.json` les clés `about.warning` (avertissement article 9 nommant santé, origine raciale ou ethnique, opinions politiques, convictions religieuses ou philosophiques, appartenance syndicale, données génétiques ou biométriques, vie ou orientation sexuelle), `about.willRemove` (« un passage relevant de {categories} sera retiré à l'envoi »), `about.removed` (« un passage relevant de {categories} a été retiré »), et `sensitive.category.<id>` pour les 8 catégories de data-model §3
- [ ] T032 [US2] Dans `src/components/AboutField.svelte`, afficher `about.warning` avant le champ, lié par `aria-describedby` ; relancer `filterSensitive` 400 ms après la dernière frappe et à la sortie du champ ; état `clean` / `warned` / `redacted` de data-model §6 ; messages dans une zone `aria-live="polite"`, sans citer le texte (FR-012 points 2 et 3)
- [ ] T033 [US2] Dans `src/components/GiftFinder.svelte`, au clic sur « Voir les idées » ou « Valider », appliquer `filterSensitive`, remplacer `draft.aboutText` par le texte nettoyé et passer le champ en `redacted` si des catégories sont trouvées, avant l'envoi ; à la réponse, si `removedCategories` n'est pas vide, remplacer le champ par `appliedAboutText` et afficher `about.removed` (research R7) ; fait passer T029

**Checkpoint** : US1 et US2 ensemble forment le MVP conforme au principe IX (US1 ne doit pas être diffusée sans US2)

---

## Phase 5: User Story 3 - Savoir ce que devient son texte et celui qui concerne un proche (Priority: P2)

**Goal**: page de confidentialité dans les quatre langues, accessible depuis le champ et le pied de
page, avec l'adresse de contact

**Independent Test**: depuis le champ libre, ouvrir le lien dans chaque langue ; la page décrit le
traitement ; les réponses déjà saisies sont conservées

### Tests (écrits d'abord, doivent échouer)

- [ ] T034 [US3] Créer `tests/e2e/us-privacy-page.spec.ts` : `/fr/confidentialite/`, `/en/confidentialite/`, `/es/confidentialite/`, `/de/confidentialite/` répondent 200 sans `Set-Cookie` ; chaque page contient l'adresse de contact, le délai d'un mois, et les sections exigées par FR-018 (texte libre et critères transmis, finalité unique, destinataire Anthropic et conservation de 30 jours au plus avec l'exception documentée, absence de conservation et de journalisation par le site, cas du tiers, filtre et ses limites, exercice des droits) ; lien vers la page dans le pied de page de `/fr/` ; depuis le champ libre (texte « fan de jazz » saisi), le lien ouvre la page dans un nouvel onglet et, de retour sur l'onglet d'origine, le texte et les autres réponses sont intacts (FR-019) ; axe sans violation sur la page

### Implémentation

- [ ] T035 [US3] Ajouter dans `src/i18n/{fr,en,es,de}.json` les clés `privacy.title`, `privacy.link` et une clé par section de FR-018 et FR-018a (`privacy.collected`, `privacy.purpose`, `privacy.recipient`, `privacy.retention`, `privacy.noLogs`, `privacy.thirdParty`, `privacy.filter`, `privacy.rights`, avec `{email}` et le délai d'un mois dans `privacy.rights`), rédigées en langage clair
- [ ] T036 [US3] Créer `src/pages/[locale]/confidentialite.astro` (`prerender = false`) avec `Base`, qui lit `env.PRIVACY_CONTACT_EMAIL` et affiche les sections de T035 ; 404 pour une langue inconnue, comme `src/pages/[locale]/index.astro` ; aucun script client
- [ ] T037 [US3] Dans `src/layouts/Base.astro`, ajouter le lien `privacy.link` vers `/{locale}/confidentialite/` dans `.site-footer` ; dans `src/components/AboutField.svelte`, ajouter à côté du champ un lien vers la même page avec `target="_blank" rel="noopener"` ; fait passer T034

**Checkpoint** : les trois user stories sont fonctionnelles

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T038 [P] Compléter `tests/e2e/a11y.spec.ts` et `tests/e2e/keyboard.spec.ts` : étape des centres d'intérêt avec le champ libre, l'avertissement et un message du filtre affiché, sans violation axe ; champ, lien de confidentialité et bouton atteignables et utilisables au clavier (FR-021)
- [ ] T039 [P] Compléter `tests/e2e/us4-languages.spec.ts` : changement de langue avec un texte libre saisi → texte conservé, avertissement et compteur dans la nouvelle langue
- [ ] T040 [P] Compléter `tests/e2e/privacy.spec.ts` : après saisie d'un texte libre et fermeture de l'onglet, rien dans `localStorage`, IndexedDB ni cookies ; le texte n'existe que dans `sessionStorage` pendant la session (SC-009)
- [ ] T041 Mesurer la consigne système avec `count_tokens` (`claude-sonnet-5-5`) et consigner la valeur dans `specs/002-reponses-champs-libres/research.md` R5 ; si elle dépasse 512 tokens, évaluer le prompt caching (research 001 R4)
- [ ] T042 Lancer `npm run check` et `npm run test:all` ; corriger jusqu'à 0 échec ; consigner commande, date, nombre de tests réussis, échoués et ignorés, et couverture dans la description de la PR (principe IV)
- [ ] T043 Ajouter à `specs/001-questionnaire-idees-cadeaux/launch-checklist.md` une section « Champ libre (002) » : adresse `find-my-kdo@proton.me` vérifiée par un message de test ; page de confidentialité relue dans les quatre langues ; journaux du Worker désactivés dans `wrangler.jsonc` et le tableau de bord ; scénario V7 du [quickstart](./quickstart.md) fait si les journaux ont été réactivés ; tests utilisateurs SC-001 à SC-004 et SC-008 consignés
- [ ] T044 Déployer sur la prévisualisation `workers.dev` et dérouler les scénarios V6 et V8 du [quickstart](./quickstart.md) ; une recherche réelle avec un texte libre inventé dans chaque langue ; consigner les résultats dans la launch-checklist
- [ ] T045 Tests utilisateurs (protocole de la 001, research 001 R14) : SC-001 à SC-004 et SC-008, au moins 5 participants par langue, consignés dans `specs/002-reponses-champs-libres/usability-results.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : T001 d'abord (PR #13 fusionnée) ; T002 à T004 ensuite
- **Foundational (Phase 2)** : dépend de la phase 1 ; bloque toutes les user stories
- **US1 (Phase 3)** : dépend de la phase 2
- **US2 (Phase 4)** : dépend de la phase 2 ; T032 et T033 dépendent de T025 et T026 (le champ doit exister)
- **US3 (Phase 5)** : dépend de la phase 2 ; T037 dépend de T025 pour le lien du champ, la page (T035, T036) peut être faite avant
- **Polish (Phase 6)** : après les user stories voulues

### Within Each Phase

- Tests avant implémentation ; ils doivent échouer d'abord
- T006 (corpus) avant T007 ; T011 avant T012 ; T010 et T012 avant T013
- Une seule tâche à la fois sur `src/components/AboutField.svelte`, `src/components/GiftFinder.svelte`, `src/pages/api/suggestions.ts` et les fichiers `src/i18n/*.json`

### Parallel Opportunities

- Phase 1 : T003 et T004
- Phase 2 : T005, T006, T008, T009 en parallèle ; puis T010 et T011 en parallèle
- US1 : T015 à T019 en parallèle
- US2 : T027 et T028 en parallèle
- Polish : T038, T039, T040 en parallèle

### Parallel Example: Phase 2

```text
T005 tests/unit/about-text.test.ts
T006 tests/fixtures/sensitive-corpus/{fr,en,es,de}.json
T008 tests/unit/criteria.test.ts
T009 tests/unit/session-state.test.ts
puis : T010 src/lib/about-text.ts  ∥  T011 src/data/sensitive-terms.json
```

### Parallel Example: User Story 1

```text
T015 tests/unit/prompt.test.ts
T016 tests/unit/api-suggestions.test.ts
T017 tests/unit/api-status.test.ts
T018 tests/unit/neutrality.test.ts
T019 tests/e2e/helpers/mock-api.ts
```

---

## Implementation Strategy

### MVP : US1 + US2

1. Phase 1 puis phase 2 (filtre et corpus au vert)
2. Phase 3 (US1), puis phase 4 (US2) **avant toute diffusion** : le principe IX interdit le
   champ libre sans avertissement ni filtre
3. Valider avec les scénarios V1 à V5 du [quickstart](./quickstart.md)

### Livraison incrémentale

1. MVP (US1 + US2) → tests au vert → PR
2. US3 (page de confidentialité) → **obligatoire avant d'activer le champ en prévisualisation
   pour d'autres personnes** (principe VIII) ; d'ici là, l'adresse peut rester vide dans un
   déploiement de test pour masquer le champ
3. Polish, déploiement de prévisualisation, tests utilisateurs

### Notes

- Si le temps manque, faire US3 avant de déployer : un déploiement avec `PRIVACY_CONTACT_EMAIL`
  renseignée affiche le champ, donc la page doit déjà exister.
