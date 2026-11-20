# Launch Checklist: Questionnaire guidé d'idées cadeaux

**Feature**: [spec.md](./spec.md) | **Tâches**: [tasks.md](./tasks.md) (T013, T075 à T080)

L'ouverture publique (T080) n'a lieu que lorsque toutes les cases sont cochées.

## Dépôt

- [x] `main` protégée sur GitHub : fusion par PR uniquement, contrôles `ci` et `secrets` obligatoires, push direct interdit (T013)
- [x] « Automatically delete head branches » activé (T013)

## Fournisseurs

- [x] ZDR abandonnée (constitution v3.0.0) : conservation standard d'Anthropic de 30 jours au plus, conforme à la limite d'un mois, repli serveur compris — source consultée le 2026-11-20 (T075)
- [x] Conditions commerciales d'Anthropic relues : les données de l'API ne servent pas à entraîner les modèles par défaut (privacy.claude.com, mis à jour le 2026-08-18 ; donneespersonnelles.fr) — date : 2026-11-20 (T075)
- [x] Exception de conservation (jusqu'à 2 ans pour les contenus signalés, ou imposée par la loi) documentée dans `plan.md` avec sa source (T075)
- [x] Liaison *Rate Limiting* du Worker vérifiée sur `workers.dev` le 2026-11-20 : **inefficace contre une rafale** (6 requêtes simultanées, puis 7 à 1 s d'intervalle : toutes en 200, aucun 429) ; limite approximative d'après la documentation. Protection partielle acceptée par le porteur tant que l'URL n'est pas diffusée ; la règle au niveau du domaine devient bloquante pour l'ouverture (T076, research R11)
  - Code en place (`SUGGESTIONS_LIMITER`, 5 requêtes par 10 s, clé `CF-Connecting-IP` jamais écrite).
  - Documentation [Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
    consultée le 2026-11-13 : compteurs locaux à chaque emplacement Cloudflare, cohérence éventuelle,
    limite approximative. La page **ne dit pas** si la liaison fonctionne sur `workers.dev` ni si les
    compteurs sont éphémères : à confirmer sur la prévisualisation (6 requêtes rapides → 429) et auprès
    de Cloudflare.
  - La page déconseille l'IP comme clé (IP partagées : un même réseau peut se voir limité). Choix à
    confirmer par le porteur ; le principe VIII v3.0.0 admet une conservation d'un mois au plus, donc
    des compteurs non éphémères restent conformes s'ils expirent sous 31 jours (research R11).

## Prévisualisation

- [x] Base D1 `quota` créée et `database_id` reporté dans `wrangler.jsonc` (T077)
- [x] Migrations appliquées en distant : table `quota_counter` présente (T077)
- [x] `ANTHROPIC_API_KEY` posée avec `wrangler secret put`, absente du dépôt (T077)
- [x] Dépense Anthropic plafonnée pendant les tests par un crédit prépayé de 5 $, recharge automatique désactivée (confirmé le 2026-11-20) (T077)
- [x] Journaux du Worker activés **temporairement** pour les tests (décision du porteur, 2026-11-20) : conservation de 7 jours au plus chez Cloudflare, aucun `console.log` dans le code, donc ni critères ni réponses journalisés ; `wrangler.jsonc` aligné (`enabled: true`) (T077)
- [x] Déploiement `workers.dev` effectué le 2026-11-20 (version `efdb988f`) : `/` redirige en 302 vers `/fr/`, `/fr/` et `/api/status` répondent 200, aucun `Set-Cookie` (T077)

## Validation

- [ ] Scénarios V1 à V8 de `quickstart.md` en local (T078)
- [ ] Essai V9 : une recherche réelle par langue (T078)
- [ ] SC-005 : 20 recherches réelles, 95e percentile < 10 s — mesure : …… (T078)
- [ ] Prompt caching : taille de la consigne mesurée, activé seulement au-delà du minimum cachable (T078)
- [ ] Tests utilisateurs SC-001 à SC-004 consignés dans `usability-results.md` (T079)

## Ouverture

- [ ] **Bloquant** : journaux du Worker désactivés (`"observability": { "enabled": false }` dans `wrangler.jsonc`, redéployé, vérifié dans le tableau de bord), conformément à FR-029 (T080)
- [ ] **Bloquant** : limite de dépense Anthropic à 17 $ par mois et alerte à 12 $, en remplacement du crédit de test (T080, principe V)
- [ ] Toutes les cases ci-dessus cochées ; URL diffusée (T080)
- [ ] **Bloquant** : domaine acheté et géré par Cloudflare, règle de limitation de débit au niveau du domaine en place et vérifiée (6 requêtes rapides → refus) ; aucune ouverture publique sur `workers.dev` (T080, research R11 et R16)
