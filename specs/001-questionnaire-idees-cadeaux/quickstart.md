# Quickstart: valider le questionnaire d'idées cadeaux

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Ce guide sert à vérifier que la fonctionnalité marche de bout en bout. Le détail des tâches
d'implémentation est dans `tasks.md`.

## Prérequis

- Node.js 24 LTS et npm.
- Un compte Cloudflare (offre gratuite) et `wrangler`, installé avec le projet.
- Une clé d'API Anthropic, seulement pour l'essai manuel V9. Les tests automatisés n'en ont pas
  besoin.
- Le dépôt cloné sur la branche `001-questionnaire-idees-cadeaux`.

## Installation

```bash
npm install
cp .dev.vars.example .dev.vars        # puis remplir ANTHROPIC_API_KEY (jamais commité)
npx wrangler d1 migrations apply quota --local
```

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Site en local sur `http://localhost:4321` |
| `npm run check` | Types TypeScript et Astro |
| `npm test` | Tests unitaires (Vitest), IA simulée |
| `npm run test:e2e` | Tests de bout en bout et d'accessibilité (Playwright + axe), IA simulée |
| `npm run test:report` | Produit le compte rendu Markdown des tests, celui que la CI écrit dans la PR |

## Scénarios de validation

Les scénarios V1 à V8 tournent en automatique avec l'IA simulée. V9 est un essai manuel avec la
vraie API.

| # | Scénario | Résultat attendu | Lien avec la spec |
|---|---|---|---|
| V1 | Ouvrir `/`, sans préférence de langue | Redirection vers `/fr/`, étape « 1 sur 4 », aucun cookie posé | US4-1, FR-002, FR-029 |
| V2 | Remplir les 3 premières étapes, puis choisir 4 centres d'intérêt | Bouton désactivé, message « Encore 1 centre d'intérêt » | US1-5, FR-010 |
| V3 | Taper « mus » à l'étape 4 | « Musicien » et « Musées » proposés ; même résultat avec « MUS » | US1-4, FR-006 |
| V4 | Choisir 5 centres d'intérêt, cliquer sur le bouton des résultats | 6 idées, prix dans la tranche, une seule requête `/api/suggestions` | US1-6, US1-7, SC-006 |
| V5 | Sur les résultats, modifier le budget sans valider | Liste inchangée, signal « critères modifiés », aucune requête ; puis valider, une seule requête | US2, FR-016 à FR-019, SC-007 |
| V6 | Comparer la même réponse simulée avec et sans `AMAZON_TAG_FR` | Ordre identique ; au plus 2 liens « lien affilié » ; mention légale seulement avec identifiant | US3, SC-010, SC-011 |
| V7 | Simuler un quota atteint, puis un délai de plus de 20 s | Message « Service limité » à la place du bouton ; puis message d'erreur avec « Réessayer » ; critères conservés | FR-024, FR-025 |
| V8 | Parcours complet en `/en/`, `/es/`, `/de/`, au clavier seul, avec analyse axe | Tous les textes traduits, aucune violation axe, tout est atteignable au clavier | US4, SC-008, ISO 9241-11 |
| V9 | Manuel : `npm run dev` avec une vraie clé, une recherche dans chaque langue | Sélection en moins de 10 s, idées pertinentes dans la bonne langue, liens Amazon du bon pays | SC-005, FR-020, FR-027 |

Vérifications complémentaires :

- `npm test` contient le test de complétude des traductions : les quatre fichiers de
  `src/i18n/` ont les mêmes clés (SC-008).
- Fermer l'onglet puis rouvrir le site : aucun critère retrouvé (SC-009).

## Protocole des tests utilisateurs (SC-001 à SC-004)

À mener avant la mise en ligne publique, sur l'environnement de prévisualisation :

1. Recruter au moins 5 participants par langue, sans lien avec le projet, sur mobile et
   ordinateur.
2. Consigne : « Trouvez une idée de cadeau pour un proche de votre choix ». Ne donner aucune autre
   aide.
3. Mesurer :
   - SC-001 : réussite sans aide ;
   - SC-002 : temps jusqu'à la première sélection, en médiane ;
   - SC-003 : nombre d'idées jugées pertinentes, avec un objectif de 3 sur 6 ou plus ;
   - SC-004 : demander au participant d'expliquer le bouton désactivé avec moins de 5 centres
     d'intérêt.
4. Noter les résultats dans `specs/001-questionnaire-idees-cadeaux/usability-results.md`, sans
   aucune donnée permettant d'identifier un participant.

## Vérifications avant mise en ligne

- `ANTHROPIC_API_KEY` posée avec `wrangler secret put`, absente du dépôt (gitleaks au vert).
- Limite de dépense Anthropic à 17 $ par mois et alerte à 12 $ (research R4).
- Observabilité du Worker désactivée dans `wrangler.jsonc`.
- Points à valider par le porteur : règle anti-abus Cloudflare (research R11) et conservation des
  données par Anthropic (research R12).
