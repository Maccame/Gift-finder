# Implementation Plan: Réponses en champ libre dans le questionnaire

**Branch**: `002-constitution-champs-libres` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-reponses-champs-libres/spec.md`

## Summary

À l'étape des centres d'intérêt, un champ facultatif « À propos de la personne » de
150 caractères permet de décrire la personne en quelques mots libres, pour des idées plus ciblées.
Un avertissement sur les données sensibles (article 9 du RGPD) précède le champ. Un filtre
signale pendant la saisie les passages sensibles et les retire à l'envoi. Le texte nettoyé ne
part qu'au modèle de génération, pour la session en cours, sans être ni conservé ni journalisé
par le site. Une page de confidentialité en quatre langues décrit ce traitement.

Approche technique, sur la base de la 001 (Astro, Svelte 5, Cloudflare Workers, Claude Sonnet
5.5) :

- un module pur `sensitive-filter.ts`, fondé sur des listes de termes versionnées dans les quatre
  langues, exécuté dans le navigateur (message et retrait) et sur le serveur (garantie) ;
- le texte nettoyé est ajouté au message JSON envoyé au modèle sous `aboutRecipient`, avec une
  phrase de consigne qui le traite comme une donnée ;
- le champ n'est affiché que si une adresse de contact est configurée, pour qu'aucune donnée
  personnelle ne soit collectée avant que la page de confidentialité soit complète ;
- coût maximal porté de 16,20 € à 16,50 € par mois, quotas inchangés.

## Technical Context

**Language/Version**: TypeScript strict (6.0), Node.js 24 LTS ou plus récent pour l'outillage ;
inchangé depuis la 001

**Primary Dependencies**: Astro 7.4 avec `@astrojs/cloudflare` 14.4 et `@astrojs/svelte`,
Svelte 5, `@anthropic-ai/sdk`, Zod ; **aucune dépendance ajoutée** (normalisation Unicode et
expressions régulières natives)

**Storage**:
- Aucun stockage serveur nouveau ; D1 reste limité aux compteurs de quota
- Listes du filtre en fichier JSON versionné (`src/data/sensitive-terms.json`)
- Texte libre dans la mémoire de l'îlot et le `sessionStorage` de l'onglet uniquement

**Testing**: Vitest (filtre et corpus, point d'accès, absence de journalisation), Playwright et
`@axe-core/playwright` (parcours, clavier, accessibilité), gitleaks ; CI GitHub Actions et compte
rendu de la 001

**Target Platform**: navigateurs récents sur mobile et ordinateur ; Cloudflare Workers
(prévisualisation sur `workers.dev`, pas encore de domaine)

**Project Type**: application web, un seul projet Astro (structure de la 001)

**Performance Goals**:
- Message du filtre affiché moins de 500 ms après la dernière frappe (400 ms d'attente comprises)
- Temps de génération inchangé : 95 % des sélections en moins de 10 s (spec 001, SC-005)
- Questionnaire sans texte libre : au plus 10 s de plus en médiane qu'en 001 (SC-002)

**Constraints**:
- 150 unités de texte au plus, contrôlées des deux côtés
- Texte jamais écrit côté serveur ni journalisé par le site, y compris en cas d'erreur
- Texte transmis uniquement au modèle de génération
- 20 € par mois au plus ; 4 langues ; WCAG AA
- Champ désactivé tant que `PRIVACY_CONTACT_EMAIL` n'est pas configurée

**Scale/Scope**:
- 1 champ, 8 catégories de filtre, 4 langues
- Au moins 160 phrases à détecter et 50 phrases neutres dans le corpus
- 1 page nouvelle par langue (confidentialité), 2 points d'accès modifiés

Aucune inconnue ne reste : voir [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v4.0.0.

| Principe | Vérification | Avant phase 0 | Après phase 1 |
|---|---|---|---|
| **I. Une branche par fonctionnalité** | Branche dédiée, un commit par tâche, fusion par PR | ⚠️ la branche porte aussi l'amendement de la constitution, que la gouvernance veut dans une PR dédiée | ⚠️ à régler avant l'implémentation (point 1 ci-dessous) |
| **II. Aucun secret dans le dépôt** (non négociable) | `PRIVACY_CONTACT_EMAIL` hors du dépôt (`.dev.vars`, variable du Worker) ; nom ajouté à `.dev.vars.example` sans valeur ; gitleaks inchangé | ✅ | ✅ (research R8) |
| **III. Web first et multilingue** | Libellé, exemple, compteur, avertissement, messages du filtre, noms de catégories et page de confidentialité dans les 4 langues ; listes du filtre dans les 4 langues ; test de complétude des clés étendu | ✅ | ✅ (research R2, R10) |
| **IV. Tests automatisés et compte rendu** (non négociable) | Corpus du filtre, garantie serveur, absence de journalisation, parcours de bout en bout ; IA toujours simulée | ✅ | ✅ (quickstart V1 à V6) |
| **V. Budget plafonné à 20 €** | +150 tokens d'entrée par recherche au plus : 16,50 € par mois au maximum, quotas inchangés ; filtre sans coût ; boîte de contact gratuite | ✅ | ✅ (research R5) |
| **VI. Neutralité de l'affiliation** | Le texte ne parle pas d'affiliation au modèle ; liens toujours ajoutés après le classement ; test de neutralité étendu au texte libre | ✅ | ✅ ([llm-input.md](./contracts/llm-input.md)) |
| **VII. Ergonomie ISO 9241-11** | SC-001 à SC-004 et SC-008 par tests utilisateurs ; champ, compteur et messages liés au champ et annoncés sans interrompre la saisie ; clavier et axe | ✅ | ✅ (research R7 ; data-model §6) |
| **VIII. Données conservées un mois au plus** (non négociable) | Aucun cookie, `sessionStorage` uniquement, aucun stockage serveur nouveau ; page de confidentialité dans les 4 langues avant toute collecte, garantie par la désactivation du champ sans contact ; conservation chez Anthropic de 30 jours au plus, avec l'exception documentée dans le plan 001 (contenus signalés, jusqu'à 2 ans, ou obligation légale) | ✅ | ✅ avec le point 2 ci-dessous |
| **IX. Réponses en champ libre** (non négociable) | 150 caractères (spec) ; facultatif ; transmis au seul modèle pour la session en cours ; jamais conservé ni journalisé par le site (test) ; avertissement article 9 avant le champ ; filtre aux cas définis et testés ; cas du tiers et lien vers la confidentialité | ✅ | ✅ avec le point 2 ci-dessous (research R1 à R7) |

**Résultat** : aucune violation à justifier dans le code ; deux points à régler.

**Points à régler** :

1. **PR dédiée pour la constitution** (principe I et gouvernance) : l'amendement v4.0.0 (commit
   `ee2a0ab`) est sur la même branche que la spec 002. Avant l'implémentation, ouvrir une PR qui
   ne contient que ce commit (par exemple une branche `constitution-v4-champs-libres` créée depuis
   `ee2a0ab`), la fusionner, puis fusionner `main` dans la branche 002, comme pour la 001.
2. **Journaux du Worker en prévisualisation** : ils sont activés temporairement depuis la 001
   (T077). Ils n'enregistrent pas le corps des requêtes, donc pas le texte libre, mais ce point
   doit être vérifié sur la prévisualisation (quickstart V7) avant de faire essayer le champ à
   quiconque. Leur désactivation reste bloquante pour l'ouverture publique (launch-checklist 001,
   T080).

**Avant l'ouverture au public** (à ajouter à la liste de lancement) :

- adresse de contact dédiée créée et posée dans `PRIVACY_CONTACT_EMAIL` ; sans elle, le site
  fonctionne mais sans champ libre (research R8) ;
- page de confidentialité relue dans les quatre langues ;
- vérification V7 faite.

## Project Structure

### Documentation (this feature)

```text
specs/002-reponses-champs-libres/
├── spec.md              # Spécification et clarifications
├── plan.md              # Ce fichier
├── research.md          # Phase 0 : filtre, coût, journaux, contact, confidentialité
├── data-model.md        # Phase 1 : AboutText, filtre, corpus, états du champ
├── quickstart.md        # Phase 1 : scénarios de validation V1 à V9
├── contracts/
│   ├── api.md           # Changements de /api/status et /api/suggestions
│   └── llm-input.md     # Changements du message et de la consigne du modèle
├── checklists/
│   └── requirements.md  # Contrôle qualité de la spec
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

Fichiers ajoutés (+) ou modifiés (~) par rapport à la 001 :

```text
src/
├── pages/
│   ├── [locale]/
│   │   ├── index.astro               ~ passe freeText et l'adresse de contact à l'îlot
│   │   └── confidentialite.astro     + page de confidentialité (FR-018, FR-018a)
│   └── api/
│       ├── status.ts                 ~ champ freeText
│       └── suggestions.ts            ~ normalisation, longueur, filtre, appliedAboutText
├── components/
│   ├── steps/InterestsStep.svelte    ~ accueille le champ libre sous les centres d'intérêt
│   ├── AboutField.svelte             + champ, avertissement, compteur, messages, lien
│   ├── CriteriaPanel.svelte          ~ champ libre modifiable depuis les résultats (FR-009)
│   └── GiftFinder.svelte             ~ retrait au clic, réponse appliedAboutText
├── lib/
│   ├── about-text.ts                 + normalisation et longueur (data-model §1)
│   ├── sensitive-filter.ts           + filterSensitive (data-model §4, research R2 et R3)
│   ├── criteria.ts                   ~ aboutText dans le schéma, l'égalité et le brouillon
│   ├── session-state.ts              ~ aboutText dans l'état de l'onglet
│   ├── types.ts                      ~ Criteria.aboutText, SensitiveCategory
│   └── generation/prompt.ts          ~ aboutRecipient et phrase de consigne
├── data/sensitive-terms.json         + listes et exclusions, 4 langues
├── i18n/{fr,en,es,de}.json           ~ textes du champ, du filtre et de la confidentialité
└── layouts/Base.astro                ~ lien vers la confidentialité dans le pied de page

tests/
├── unit/
│   ├── sensitive-filter.test.ts      + corpus complet (SC-005, SC-006)
│   ├── about-text.test.ts            + normalisation, longueur
│   ├── no-log.test.ts                + aucun console.*, marqueur absent (SC-007)
│   ├── api-suggestions.test.ts       ~ garantie serveur, 400, champ désactivé
│   ├── prompt.test.ts                ~ aboutRecipient, non-régression sans texte
│   └── neutrality.test.ts            ~ critères avec texte libre (SC-011)
├── e2e/
│   ├── us-free-text.spec.ts          + US1 et US2, sans trace ni capture
│   └── us-privacy-page.spec.ts       + US3, 4 langues
└── fixtures/sensitive-corpus/        + fr.json, en.json, es.json, de.json

.dev.vars.example                     ~ PRIVACY_CONTACT_EMAIL sans valeur
```

**Structure Decision** : on garde le projet Astro unique de la 001. Le filtre et la
normalisation sont des modules purs de `src/lib/`, importés à la fois par l'îlot Svelte et par le
point d'accès, ce qui garantit le même comportement des deux côtés. `claude.ts` reste le seul
fichier qui parle à l'API payante.

## Complexity Tracking

Aucune violation de la constitution à justifier ; le point 1 (PR dédiée à la constitution) est
une étape de procédure, pas une dérogation.
