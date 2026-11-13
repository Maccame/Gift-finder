# Implementation Plan: Questionnaire guidé d'idées cadeaux

**Branch**: `001-questionnaire-idees-cadeaux` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-questionnaire-idees-cadeaux/spec.md`

## Summary

Site web multilingue (fr par défaut, en, es, de) où un visiteur anonyme répond à un
questionnaire en 4 étapes : occasion, relation, budget, puis 5 à 10 centres d'intérêt choisis
dans un référentiel traduit d'environ 150 entrées. Sur validation explicite, il obtient une
sélection de 6 idées de cadeaux au plus, avec un prix indicatif et des liens de recherche Amazon
et Etsy. Les critères restent modifiables, mais la liste ne se rafraîchit qu'à la validation.

Approche technique :

- Un site **Astro + TypeScript** hébergé sur **Cloudflare Workers** (offre gratuite).
- Le questionnaire et les résultats forment un îlot interactif **Svelte 5**.
- Un point d'accès serveur appelle **Claude Sonnet 5.5** en sortie structurée. Il valide les
  idées et fige leur ordre. Ensuite seulement, il construit les liens et ajoute au plus
  2 identifiants **Amazon Partenaires**, signalés.
- Un compteur **D1** applique un quota de 30 recherches par jour et 700 par mois, sans aucune
  donnée de visiteur. Le coût maximal est de 16,20 € par mois.

## Technical Context

**Language/Version**: TypeScript (mode strict ; 6.0 installé) ; Node.js 24 LTS ou plus récent pour l'outillage (développement sous Node 26 LTS, CI sous Node 24)

**Primary Dependencies**:
- Astro (7.4 installé) avec `@astrojs/cloudflare` (14.4) et `@astrojs/svelte` ; avec cette version de
  l'adaptateur, l'environnement du Worker se lit par `import { env } from "cloudflare:workers"`, et
  les sessions Astro (cookie et KV) sont désactivées par `session: false`
- Svelte 5
- `@anthropic-ai/sdk`
- Zod, pour la validation et la sortie structurée

**Storage**:
- Cloudflare D1, uniquement pour les compteurs de quota
- Données de référence en fichiers JSON versionnés
- État du visiteur en mémoire et dans le `sessionStorage` de l'onglet

**Testing**:
- Vitest pour les tests unitaires
- Playwright et `@axe-core/playwright` pour les tests de bout en bout et d'accessibilité
- gitleaks pour les secrets
- GitHub Actions pour la CI, qui écrit le compte rendu dans la PR

**Target Platform**: navigateurs récents sur mobile et ordinateur ; serveur Cloudflare Workers

**Project Type**: application web, en un seul projet Astro (pages et points d'accès `/api/*`)

**Performance Goals**:
- Sélection affichée en moins de 10 s pour 95 % des validations (SC-005)
- Recherche de centres d'intérêt instantanée, faite dans le navigateur
- Première sélection en moins de 3 min en médiane (SC-002)

**Constraints**:
- 20 € par mois au plus, tout compris
- Génération abandonnée à 20 s
- Aucun cookie, aucun journal, aucun analytics, aucune IP conservée
- 4 langues complètes
- Accessibilité WCAG AA (vérifiée par axe)
- Au plus 2 liens affiliés, ajoutés après le classement
- Limitation de débit : 5 requêtes par 10 s sur `/api/suggestions` (liaison du Worker)

**Scale/Scope**:
- 30 recherches par jour et 700 par mois au plus (quotas configurables)
- Environ 150 centres d'intérêt
- 1 page applicative par langue et 2 points d'accès

Toutes les inconnues sont levées en phase 0 : voir [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v2.2.0 (la PR de la constitution est fusionnée et `main` est fusionnée dans la branche).

| Principe | Vérification | Avant phase 0 | Après phase 1 |
|---|---|---|---|
| **I. Une branche par fonctionnalité** | Branche `001-questionnaire-idees-cadeaux` ; `main` protégée ; un commit par tâche ; fusion par PR uniquement | ✅ dépôt GitHub en place | ✅ un commit par tâche ; protection de `main` à activer (T013, `launch-checklist.md`) |
| **II. Aucun secret dans le dépôt** (non négociable) | Clés en secrets Cloudflare ; `.dev.vars` ignoré ; `.dev.vars.example` sans valeurs ; gitleaks en pré-commit et en CI | ✅ | ✅ (research R10) |
| **III. Web first et multilingue** | Site responsive sans installation ; fr, en, es, de, avec fr par défaut ; langue dans l'URL ; textes et référentiel dans des fichiers de traduction ; test de complétude des clés ; idées générées dans la langue active | ✅ | ✅ (research R6, R7 ; data-model §1–2) |
| **IV. Tests automatisés et compte rendu** (non négociable) | Vitest et Playwright sur chaque PR ; IA toujours simulée ; compte rendu (avec couverture) écrit dans la description de la PR ; fusion bloquée si un test échoue | ✅ | ✅ (research R9 ; quickstart V1–V8) |
| **V. Budget plafonné à 20 €** | Estimation pessimiste de 16,20 € par mois au plus ; quotas journalier et mensuel vérifiés avant chaque appel payant ; message sur place quand ils sont atteints ; limite de dépense côté Anthropic | ✅ | ✅ (research R4, R5, R13) |
| **VI. Neutralité de l'affiliation** | L'IA ignore l'affiliation ; ordre figé avant l'ajout des liens ; au plus 2 liens affiliés, signalés ; mention légale ; test de neutralité | ✅ | ✅ (research R8 ; [api.md](./contracts/api.md) étapes 5–7) |
| **VII. Ergonomie ISO 9241-11** | Utilisateurs, objectifs et contexte décrits dans la spec ; SC-001 à SC-004 mesurés par un protocole de tests utilisateurs ; chaque erreur propose une action ; parcours au clavier et axe | ✅ | ✅ (research R14 ; [quickstart.md](./quickstart.md)) |
| **VIII. Aucune donnée au-delà de la session** (non négociable) | Pas de cookie, `sessionStorage` uniquement ; D1 limité aux compteurs ; observabilité du Worker désactivée ; référentiel fermé, donc aucune donnée personnelle envoyée à l'IA | ✅ | ✅ avec 2 points à valider avant la mise en ligne (ci-dessous) |

**Résultat** : aucune violation à justifier.

**Points à vérifier avant l'ouverture au public** (non bloquants pour le développement ; suivis
dans `launch-checklist.md`) :

1. Anti-abus (research R11, tâche T076) : liaison *Rate Limiting* du Worker en place. La
   documentation Cloudflare (consultée le 2026-11-13) décrit des compteurs locaux à chaque
   emplacement, à cohérence éventuelle, mais ne dit ni s'ils fonctionnent sur `workers.dev` ni
   s'ils sont éphémères ; elle déconseille aussi l'IP comme clé. Points à confirmer sur la
   prévisualisation (voir `launch-checklist.md`).
2. Conservation par le fournisseur d'IA (research R12, tâche T075) : ZDR demandée à l'équipe
   commerciale d'Anthropic ; éligibilité du repli serveur à confirmer.
   **Exception documentée (principe VIII)** : même sous ZDR, Anthropic peut conserver jusqu'à
   2 ans les entrées et sorties signalées par ses systèmes de sécurité, ou quand la loi l'exige
   (source : documentation « API et conservation des données », consultée le 2026-11-13). Les
   données envoyées (occasion, relation, tranche de budget, libellés du référentiel) ne
   permettent d'identifier personne.

## Project Structure

### Documentation (this feature)

```text
specs/001-questionnaire-idees-cadeaux/
├── spec.md              # Spécification (mise à jour avec les décisions du plan)
├── plan.md              # Ce fichier
├── research.md          # Phase 0 : décisions techniques, coûts, quotas
├── data-model.md        # Phase 1 : entités, règles de validation, états de l'interface
├── quickstart.md        # Phase 1 : guide de validation de bout en bout
├── contracts/
│   ├── api.md           # API HTTP navigateur ↔ serveur
│   └── llm-output.md    # Échange serveur ↔ API Claude
├── checklists/
│   └── requirements.md  # Contrôle qualité de la spec
├── tasks.md             # Phase 2 : tâches (/speckit-tasks)
└── launch-checklist.md  # Points à cocher avant l'ouverture au public (T013, T075 à T080)
```

### Source Code (repository root)

```text
src/
├── pages/
│   ├── index.astro                 # redirige vers /fr/, /en/… selon le navigateur, sans cookie
│   ├── [locale]/index.astro        # page du questionnaire et des résultats
│   └── api/
│       ├── status.ts               # GET /api/status
│       └── suggestions.ts          # POST /api/suggestions
├── components/
│   ├── GiftFinder.svelte           # îlot interactif : étapes, états, résultats
│   ├── steps/                      # OccasionStep, RelationStep, BudgetStep, InterestsStep
│   ├── InterestPicker.svelte       # recherche et navigation par catégorie dans le référentiel
│   ├── CriteriaStatus.svelte       # message des centres d'intérêt manquants (FR-010)
│   ├── CriteriaPanel.svelte        # critères modifiables sur la page des résultats (FR-015)
│   ├── StaleNotice.svelte          # signal « critères modifiés » (FR-017)
│   ├── LanguageSwitcher.astro      # liens vers les 4 langues, sans cookie
│   ├── ResultsList.svelte          # 6 idées, prix indicatif, liens, mention « lien affilié »
│   ├── QuotaNotice.svelte          # message « service limité » à la place du bouton (FR-024)
│   └── ErrorNotice.svelte          # erreur et bouton « Réessayer » (FR-025)
├── lib/
│   ├── types.ts                    # types du data-model
│   ├── http.ts                     # réponses JSON sans cache ni cookie
│   ├── api-client.ts               # appels du navigateur vers /api/*
│   ├── locale-redirect.ts          # choix de la langue de / selon Accept-Language
│   ├── locales.ts                  # LOCALES, sans fichier de langue (utilisable côté navigateur)
│   ├── translate.ts                # traduction et pluriels à partir des messages d'une langue
│   ├── criteria.ts                 # getCriteriaStatus, égalité des critères
│   ├── interests-search.ts         # normalisation et recherche dans le référentiel
│   ├── session-state.ts            # lecture et écriture dans sessionStorage uniquement
│   ├── generation/
│   │   ├── claude.ts               # appel Claude Sonnet 5.5 (seul fichier qui parle à l'API)
│   │   ├── prompt.ts               # consigne système fixe
│   │   ├── schema.ts               # schéma Zod de sortie
│   │   └── validate.ts             # budget, doublons, centres d'intérêt, ordre figé
│   ├── links.ts                    # liens Amazon/Etsy puis affiliation (après classement)
│   ├── quota.ts                    # réservation atomique D1, périodes Europe/Paris
│   └── i18n.ts                     # t(clé) typée, langue depuis l'URL
├── data/                           # occasions, relations, budgets, interests (.json)
├── i18n/                           # fr.json, en.json, es.json, de.json
└── layouts/Base.astro              # mise en page, pied de page avec mention Amazon si affiliation

migrations/0001_quota_counter.sql   # table quota_counter
tests/
├── unit/                           # criteria, search, validate, links, neutrality, quota, i18n…
├── e2e/                            # US1 à US4, clavier, axe, confidentialité
└── fixtures/llm/                   # réponses enregistrées du modèle (voir llm-output.md)

scripts/test-report.mjs             # compte rendu des tests, écrit dans la PR par la CI
.githooks/pre-commit                # gitleaks sur les changements indexés

.github/
├── workflows/ci.yml                # check, test, test:e2e, gitleaks, compte rendu dans la PR
└── pull_request_template.md        # cases de la constitution et section du compte rendu
.gitignore                          # inclut .dev.vars
.dev.vars.example                   # noms des secrets, sans valeurs
wrangler.jsonc                      # Worker, liaison D1, limitation de débit, observabilité désactivée
astro.config.mjs                    # i18n (fr par défaut), adaptateur Cloudflare, Svelte
```

**Structure Decision** : un seul projet Astro à la racine du dépôt, avec les pages et l'API dans
`src/pages/`. On évite ainsi de gérer deux projets (front et back) quand on débute. La logique
métier testable sans navigateur ni réseau est isolée dans `src/lib/`. Seul
`src/lib/generation/claude.ts` communique avec l'API payante, ce qui la rend facile à simuler en
test.

## Complexity Tracking

Aucune violation de la constitution : section sans objet.
