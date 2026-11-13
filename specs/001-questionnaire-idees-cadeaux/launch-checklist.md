# Launch Checklist: Questionnaire guidé d'idées cadeaux

**Feature**: [spec.md](./spec.md) | **Tâches**: [tasks.md](./tasks.md) (T013, T075 à T080)

L'ouverture publique (T080) n'a lieu que lorsque toutes les cases sont cochées.

## Dépôt

- [ ] `main` protégée sur GitHub : fusion par PR uniquement, contrôles `ci` et `secrets` obligatoires, push direct interdit (T013)
- [ ] « Automatically delete head branches » activé (T013)

## Fournisseurs

- [ ] ZDR demandée à Anthropic pour l'organisation de la clé de production — date de la demande : …… (T075)
- [ ] Réponse d'Anthropic reçue — date : …… ; ZDR active depuis le : …… (T075)
- [ ] Éligibilité du repli serveur (`fallbacks`, bêta `server-side-fallback-2026-07-01`) confirmée, ou repli retiré du code (T075)
- [ ] Exception de conservation (jusqu'à 2 ans pour les contenus signalés, ou imposée par la loi) documentée dans `plan.md` avec sa source (T075)
- [ ] Liaison *Rate Limiting* du Worker vérifiée sur `workers.dev`, compteurs éphémères confirmés (T076)

## Prévisualisation

- [ ] Base D1 `quota` créée et `database_id` reporté dans `wrangler.jsonc` (T077)
- [ ] Migrations appliquées en distant (T077)
- [ ] `ANTHROPIC_API_KEY` posée avec `wrangler secret put`, absente du dépôt (T077)
- [ ] Limite de dépense Anthropic à 17 $ par mois et alerte à 12 $ (T077)
- [ ] Observabilité du Worker désactivée (vérifiée dans le tableau de bord) (T077)
- [ ] Déploiement `workers.dev` effectué (T077)

## Validation

- [ ] Scénarios V1 à V8 de `quickstart.md` en local (T078)
- [ ] Essai V9 : une recherche réelle par langue (T078)
- [ ] SC-005 : 20 recherches réelles, 95e percentile < 10 s — mesure : …… (T078)
- [ ] Prompt caching : taille de la consigne mesurée, activé seulement au-delà du minimum cachable (T078)
- [ ] Tests utilisateurs SC-001 à SC-004 consignés dans `usability-results.md` (T079)

## Ouverture

- [ ] Toutes les cases ci-dessus cochées ; URL diffusée (T080)
- [ ] Règle de limitation de débit au niveau du domaine, une fois le domaine acheté (T080, research R16)
