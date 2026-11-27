# Quickstart: valider les réponses en champ libre

**Feature**: [spec.md](./spec.md) | **Base**: [quickstart 001](../001-questionnaire-idees-cadeaux/quickstart.md)

## Prérequis

- Installation et commandes de la 001 (`npm install`, `npm run dev`, `npm run test:all`).
- `PRIVACY_CONTACT_EMAIL` vient des `vars` de `wrangler.jsonc` (`find-my-kdo@proton.me`). Pour
  V6, la vider le temps de l'essai dans `.dev.vars` (`PRIVACY_CONTACT_EMAIL=`), non versionné.
- Tous les appels à l'API Anthropic restent simulés en test (principe IV).

## Scénarios

| # | Scénario | Commande ou action | Résultat attendu |
|---|---|---|---|
| V1 | Non-régression de la 001 | `npm run test:all` | Tous les tests de la 001 passent ; sans texte libre, le message au modèle est identique à celui de la 001 |
| V2 | Corpus du filtre | `npx vitest run tests/unit/sensitive-filter.test.ts` | 100 % des phrases `detect` détectées avec le texte attendu ; au plus 5 % des phrases `neutral` détectées (SC-005, SC-006) |
| V3 | Garantie serveur | `npx vitest run tests/unit/api-suggestions.test.ts` | Une requête directe avec une phrase `detect` : le passage est absent de la requête envoyée au modèle simulé ; `removedCategories` renseigné ; plus de 150 unités → 400 |
| V4 | Aucune fuite dans les journaux | `npx vitest run tests/unit/no-log.test.ts` | Aucun `console.*` dans `src/` ; texte marqueur absent des sorties et des réponses d'erreur dans tous les scénarios (SC-007) |
| V5 | Parcours dans le navigateur | `npx playwright test tests/e2e/us-free-text.spec.ts` | Champ facultatif, compteur, coupure au collage, avertissement avant le champ, message pendant la saisie, retrait au clic, lien vers la confidentialité sans perte des réponses, 4 langues, clavier et axe sans violation |
| V6 | Champ désactivé sans contact | `PRIVACY_CONTACT_EMAIL` vide, `npm run dev` | Pas de champ libre ; `GET /api/status` renvoie `freeText: false` ; un `aboutText` envoyé directement → 400 |
| V7 | Journaux du Worker en prévisualisation | Déployer sur `workers.dev`, faire une recherche avec un texte marqueur inventé, ouvrir les journaux du Worker dans le tableau de bord Cloudflare | Le marqueur n'apparaît dans aucune entrée (research R6, point 5) |
| V8 | Page de confidentialité | Ouvrir `/fr/confidentialite/`, puis `en`, `es`, `de` | Contenu de FR-018 et FR-018a, adresse de contact affichée, délai d'un mois, aucun cookie |
| V9 | Pertinence et compréhension | Tests utilisateurs, protocole de la 001 (research 001 R14) | SC-001 à SC-004 et SC-008 consignés |
