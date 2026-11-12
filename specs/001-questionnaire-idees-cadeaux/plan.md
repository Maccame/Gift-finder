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

**Language/Version**: TypeScript 5.x (mode strict) ; Node.js 24 LTS pour l'outillage

**Primary Dependencies**:
- Astro (version stable courante) avec `@astrojs/cloudflare` et `@astrojs/svelte`
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

**Scale/Scope**:
- 30 recherches par jour et 700 par mois au plus (quotas configurables)
- Environ 150 centres d'intérêt
- 1 page applicative par langue et 2 points d'accès

Toutes les inconnues sont levées en phase 0 : voir [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v2.1.0.

| Principe | Vérification | Avant phase 0 | Après phase 1 |
|---|---|---|---|
| **I. Une branche par fonctionnalité** | Branche `001-questionnaire-idees-cadeaux` ; `main` protégée ; un commit par tâche ; fusion par PR uniquement | ⚠️ prérequis : le dossier n'est pas encore un dépôt git | ✅ prévu comme première tâche (research R15) |
| **II. Aucun secret dans le dépôt** (non négociable) | Clés en secrets Cloudflare ; `.dev.vars` ignoré ; `.dev.vars.example` sans valeurs ; gitleaks en pré-commit et en CI | ✅ | ✅ (research R10) |
| **III. Web first et multilingue** | Site responsive sans installation ; fr, en, es, de, avec fr par défaut ; langue dans l'URL ; textes et référentiel dans des fichiers de traduction ; test de complétude des clés ; idées générées dans la langue active | ✅ | ✅ (research R6, R7 ; data-model §1–2) |
| **IV. Tests automatisés et compte rendu** (non négociable) | Vitest et Playwright sur chaque PR ; IA toujours simulée ; compte rendu (avec couverture) écrit dans la description de la PR ; fusion bloquée si un test échoue | ✅ | ✅ (research R9 ; quickstart V1–V8) |
| **V. Budget plafonné à 20 €** | Estimation pessimiste de 16,20 € par mois au plus ; quotas journalier et mensuel vérifiés avant chaque appel payant ; message sur place quand ils sont atteints ; limite de dépense côté Anthropic | ✅ | ✅ (research R4, R5, R13) |
| **VI. Neutralité de l'affiliation** | L'IA ignore l'affiliation ; ordre figé avant l'ajout des liens ; au plus 2 liens affiliés, signalés ; mention légale ; test de neutralité | ✅ | ✅ (research R8 ; [api.md](./contracts/api.md) étapes 5–7) |
| **VII. Ergonomie ISO 9241-11** | Utilisateurs, objectifs et contexte décrits dans la spec ; SC-001 à SC-004 mesurés par un protocole de tests utilisateurs ; chaque erreur propose une action ; parcours au clavier et axe | ✅ | ✅ (research R14 ; [quickstart.md](./quickstart.md)) |
| **VIII. Aucune donnée au-delà de la session** (non négociable) | Pas de cookie, `sessionStorage` uniquement ; D1 limité aux compteurs ; observabilité du Worker désactivée ; référentiel fermé, donc aucune donnée personnelle envoyée à l'IA | ✅ | ✅ avec 2 points à valider avant la mise en ligne (ci-dessous) |

**Résultat** : aucune violation à justifier. Le prérequis du principe I (créer le dépôt git)
est la première tâche.

**Points à valider par le porteur avant la mise en ligne publique** (non bloquants pour le
développement) :

1. Règle anti-abus Cloudflare (research R11) : les compteurs par IP de Cloudflare sont
   éphémères et ne sont pas stockés par le site ; il faut confirmer qu'ils respectent le
   principe VIII.
2. Conservation par le fournisseur d'IA (research R12) : relire la politique de conservation de
   l'API Anthropic, et demander une conservation nulle si elle ne satisfait pas le principe VIII.

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
└── tasks.md             # Phase 2 (/speckit-tasks, pas encore créé)
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
│   ├── ResultsList.svelte          # 6 idées, prix indicatif, liens, mention « lien affilié »
│   ├── QuotaNotice.svelte          # message « service limité » à la place du bouton (FR-024)
│   └── ErrorNotice.svelte          # erreur et bouton « Réessayer » (FR-025)
├── lib/
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
├── unit/                           # criteria, search, validate, links, neutrality, quota, i18n
├── e2e/                            # US1 à US4, clavier, axe
└── fixtures/llm/                   # réponses enregistrées du modèle (voir llm-output.md)

.github/
├── workflows/ci.yml                # check, test, test:e2e, gitleaks, compte rendu dans la PR
└── pull_request_template.md        # cases de la constitution et section du compte rendu
.gitignore                          # inclut .dev.vars
.dev.vars.example                   # noms des secrets, sans valeurs
wrangler.jsonc                      # Worker, liaison D1, observabilité désactivée
astro.config.mjs                    # i18n (fr par défaut), adaptateur Cloudflare, Svelte
```

**Structure Decision** : un seul projet Astro à la racine du dépôt, avec les pages et l'API dans
`src/pages/`. On évite ainsi de gérer deux projets (front et back) quand on débute. La logique
métier testable sans navigateur ni réseau est isolée dans `src/lib/`. Seul
`src/lib/generation/claude.ts` communique avec l'API payante, ce qui la rend facile à simuler en
test.

## Complexity Tracking

Aucune violation de la constitution : section sans objet.
