# Research: Questionnaire guidé d'idées cadeaux

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-11

Chaque décision suit le format : décision, justification, alternatives écartées. Les décisions
marquées « choix du porteur » ont été prises par le porteur du projet pendant la préparation du
plan.

## R1. Framework du site

- **Décision** : Astro (version stable courante) en TypeScript strict, avec un îlot interactif
  Svelte 5 pour le questionnaire et les résultats. Choix du porteur.
- **Justification** : Astro sert des pages statiques légères et ne charge du JavaScript que pour
  l'îlot interactif, ce qui donne un premier affichage rapide sur mobile. Son routage i18n
  intégré gère `/fr/`, `/en/`, `/es/`, `/de/` sans cookie. Pages et points d'accès `/api/*`
  vivent dans un seul projet, plus simple à maintenir pour un débutant.
- **Alternatives écartées** : Next.js (plus lourd, hébergement idéal payant) ; SvelteKit (très
  proche, mais l'i18n est à construire soi-même) ; site statique + fonctions séparées (deux
  projets à gérer).

## R2. Hébergement

- **Décision** : Cloudflare Workers, offre gratuite, avec les fichiers statiques servis par le
  Worker et l'adaptateur `@astrojs/cloudflare`. Choix du porteur.
- **Justification** : l'offre gratuite (100 000 requêtes par jour, fichiers statiques gratuits)
  couvre très largement le trafic prévu, donc 0 € d'hébergement. Les journaux du Worker
  (observabilité) se désactivent dans la configuration, ce que demande le principe VIII.
- **Alternatives écartées** : Vercel Hobby (interdit l'usage commercial, or le site a des liens
  affiliés) ; Netlify (offre gratuite comparable, mais pas de base de données intégrée pour les
  quotas) ; AWS S3 + CloudFront + Lambda (plus de services à configurer et à surveiller).

## R3. Modèle de génération des idées

- **Décision** : Claude Sonnet 5.5 (`claude-sonnet-5-5`) via le SDK officiel
  `@anthropic-ai/sdk`. Choix du porteur.
  - Sortie structurée (`output_config.format`, schéma Zod) : la réponse est garantie conforme au
    schéma de [llm-output.md](./contracts/llm-output.md), puis revalidée côté serveur.
  - Effort `low` (`output_config.effort`) pour limiter les tokens et le temps de réponse ; à
    relever à `medium` seulement si les tests de qualité le justifient.
  - Repli automatique en cas de refus (`fallbacks: "default"`, bêta
    `server-side-fallback-2026-07-01`) : si une demande est refusée par les filtres de sécurité,
    l'API la rejoue sur un autre modèle dans le même appel, au lieu d'un échec visible.
  - `max_tokens` à 4 000, abandon de l'appel à 20 s, aucune nouvelle tentative automatique
    (`maxRetries: 0`) : le visiteur relance lui-même avec « Réessayer », ce qui évite de payer
    plusieurs appels en silence.
- **Justification** : Sonnet 5.5 donne des idées plus fines et plus originales que Haiku 5.5,
  tout en tenant dans le budget (voir R4).
- **Alternatives écartées** : Claude Haiku 5.5 (20 fois moins cher, mais des idées plus
  convenues et pas de repli serveur en cas de refus) ; Claude Opus 5.5 (deux fois plus cher,
  donc environ 350 recherches par mois seulement).
- **À vérifier à l'implémentation** : si l'assistant `messages.parse` n'est pas disponible sur
  l'appel bêta qui porte `fallbacks`, appeler `beta.messages.create` avec le même
  `output_config.format` et valider la réponse avec le schéma Zod.

## R4. Coût et quotas

Prix de Claude Sonnet 5.5 : 2 $ par million de tokens en entrée, 10 $ en sortie. Taux retenu :
1 $ = 0,92 €.

| Poste par recherche (estimation pessimiste) | Tokens | Coût |
|---|---|---|
| Entrée : consigne fixe, schéma, critères | 1 500 | 0,003 $ |
| Sortie : 6 idées en JSON + réflexion du modèle | 2 000 | 0,020 $ |
| **Total** | | **0,023 $ ≈ 0,021 €** |

| Poste mensuel | Montant |
|---|---|
| Hébergement Cloudflare (offre gratuite) | 0 € |
| Nom de domaine (réservé, acheté plus tard) | 1,50 € |
| Marge de sécurité (change, estimation) | 3,50 € |
| **Reste pour l'API** | **15,00 €** |

- **Décision** :
  - Quota mensuel : **700 recherches** (700 × 0,021 € ≈ 14,70 €).
  - Quota journalier : **30 recherches**, pour éviter qu'un pic épuise le mois en un jour.
  - Les deux quotas sont des variables de configuration.
  - Filet de sécurité : limite de dépense mensuelle de 17 $ dans la console Anthropic, et alerte
    à 12 $.
  - Coût maximal total : 14,70 € + 1,50 € = **16,20 € par mois**, sous le plafond de 20 €.
- **Justification** : le quota est vérifié avant chaque appel payant, donc le budget tient même si
  le site est très visité. La limite côté Anthropic protège contre une erreur de code.
- **Alternatives écartées** : quota seulement mensuel (un pic peut tout consommer le premier
  jour) ; aucune limite côté Anthropic (une erreur de comptage pourrait dépasser le budget).
- **Piste d'économie** : mettre en cache la consigne fixe (prompt caching) si elle dépasse la
  taille minimale cachable ; à mesurer une fois la consigne écrite.

## R5. Stockage du compteur de quota

- **Décision** : Cloudflare D1 (offre gratuite), une table `quota_counter` avec une ligne par
  période (`day:2026-11-11`, `month:2026-11`) et son compteur. La réservation est une seule
  requête atomique qui incrémente le compteur seulement s'il est sous la limite. Les périodes
  suivent le fuseau Europe/Paris.
- **Justification** : D1 garantit qu'une réservation est atomique, donc deux visiteurs
  simultanés ne peuvent pas dépasser le quota. La table ne contient que des compteurs, aucune
  donnée de visiteur (principe VIII). L'offre gratuite suffit largement.
- **Alternatives écartées** : Workers KV (cohérence éventuelle, donc dépassements possibles) ;
  compteur en mémoire (perdu entre les instances du Worker).
- **Règle** : une recherche réservée compte même si la génération échoue ensuite. Le décompte
  est pessimiste, donc il ne sous-estime jamais la dépense.

## R6. Langues

- **Décision** : routage i18n d'Astro avec `/fr/` (par défaut), `/en/`, `/es/`, `/de/`. La racine
  `/` redirige vers la langue du navigateur (`Accept-Language`), sinon vers `/fr/`, sans cookie.
  Les textes sont dans `src/i18n/{fr,en,es,de}.json`, lus par une fonction `t(clé)` typée. Un
  test vérifie que les quatre fichiers ont exactement les mêmes clés.
- **Justification** : la langue portée par l'URL respecte le principe VIII (pas de cookie) et
  donne des liens partageables. Les clés typées empêchent un texte manquant de passer en CI.
- **Alternatives écartées** : langue mémorisée en cookie ou en `localStorage` (interdits par le
  principe VIII) ; bibliothèque i18n complète (inutile pour quatre fichiers de textes).

## R7. Référentiel des centres d'intérêt

- **Décision** : environ 150 centres d'intérêt dans `src/data/interests.json`, chacun avec un
  identifiant stable (ex. `musician`), une catégorie (musique, sport, jeux, nature…) et un libellé
  dans les quatre langues. La recherche se fait dans le navigateur, sans appel réseau, sur les
  libellés de la langue active, en ignorant majuscules et accents. Choix du porteur.
- **Justification** : sans texte libre, aucune consigne cachée ne peut être glissée dans
  l'appel à l'IA, aucune donnée personnelle ne peut y être saisie, et le coût par appel est
  prévisible. La recherche locale est instantanée.
- **Alternatives écartées** : texte libre (risque de détournement et de données personnelles
  envoyées à un tiers) ; recherche côté serveur (latence et appels inutiles).

## R8. Liens d'achat et neutralité de l'affiliation

- **Décision** : le traitement serveur suit toujours cet ordre :
  1. génération par l'IA, qui ignore tout de l'affiliation ;
  2. validation (schéma, budget, doublons) ;
  3. **ordre figé** : celui renvoyé par l'IA, après filtrage ;
  4. construction des liens de recherche pour chaque idée, à partir de son champ
     `searchQuery` :
     - Amazon du pays de la langue : `amazon.fr`, `amazon.de`, `amazon.es`, `amazon.co.uk` ;
     - Etsy : `etsy.com`.
     Choix du porteur : Amazon et Etsy ;
  5. ajout de l'identifiant affilié Amazon du pays aux liens Amazon des **2 premières idées**,
     seulement s'il est configuré. Choix du porteur : 2 au plus.
- **Justification** : comme l'ordre est figé avant l'étape 4, il ne peut pas dépendre de
  l'affiliation (principe VI). Un test unitaire passe la même réponse simulée de l'IA avec et
  sans identifiant, puis compare l'ordre (SC-010).
- **Signalement** : mention « lien affilié » à côté de chaque lien affilié. Quand un
  identifiant Amazon est configuré, le pied de page affiche la mention légale exigée par
  Amazon Partenaires, dans les quatre langues.
- **Identifiants** : un secret par pays (`AMAZON_TAG_FR`, `AMAZON_TAG_DE`, `AMAZON_TAG_ES`,
  `AMAZON_TAG_UK`). Vides au lancement, puisque le porteur n'a pas encore de compte.
- **Alternatives écartées** : demander les liens à l'IA (URL inventées, et l'affiliation
  pourrait influencer la génération) ; API produits Amazon (exige un compte affilié actif avec
  des ventes, et ajoute de la complexité).

## R9. Tests et compte rendu dans la PR

- **Décision** :
  - Vitest pour les tests unitaires (critères, recherche, validation, liens, neutralité,
    quota, i18n).
  - Playwright avec `@axe-core/playwright` pour les tests de bout en bout et d'accessibilité.
  - L'IA est toujours simulée par des réponses enregistrées dans `tests/fixtures/llm/` ; aucun
    test n'appelle l'API payante.
  - GitHub Actions lance `npm run check`, `npm test` et `npm run test:e2e` sur chaque PR.
  - Une dernière étape écrit le compte rendu des tests (commande, date, réussis, échoués,
    ignorés, couverture mesurée par Vitest) dans une section délimitée de la description de
    la PR, avec `gh pr edit`.
  - La branche `main` est protégée : la fusion exige des contrôles au vert.
- **Justification** : c'est le principe IV, appliqué sans action manuelle.
- **Alternatives écartées** : compte rendu collé à la main (oubli facile) ; Jest (plus lent
  avec Astro et Vite).

## R10. Secrets

- **Décision** :
  - En production, les secrets sont des secrets Cloudflare, posés avec `wrangler secret put` :
    `ANTHROPIC_API_KEY` et les `AMAZON_TAG_*`.
  - En local, ils vivent dans `.dev.vars`, ignoré par git. `.dev.vars.example`, versionné, liste
    leurs noms sans les valeurs.
  - gitleaks tourne en hook de pré-commit et en CI.
- **Justification** : c'est le principe II, avec deux barrières contre une fuite.
- **Alternatives écartées** : un fichier `.env` commité ou chiffré dans le dépôt (contraire au
  principe II).

## R11. Protection contre les abus

- **Décision** :
  - Une règle de limitation de débit Cloudflare sur `/api/suggestions` (offre gratuite :
    1 règle), par exemple 5 requêtes par tranche de 10 secondes et par adresse IP.
  - Les compteurs de cette règle sont tenus par Cloudflare, en mémoire et de façon éphémère ; le
    site ne stocke aucune IP.
  - En complément, le quota journalier (R4) borne la dépense quoi qu'il arrive.
- **Justification** : la règle empêche un robot de vider le quota journalier en quelques
  secondes au détriment des vrais visiteurs. Le principe VIII autorise une limitation de débit
  en mémoire, sans persistance.
- **À valider par le porteur avant la mise en ligne publique** : la conformité de cette règle
  au principe VIII, une fois les conditions de conservation de Cloudflare relues (non bloquant
  pour le développement).
- **Alternatives écartées** : CAPTCHA (dégrade l'ergonomie, et souvent des cookies tiers) ;
  limitation par IP stockée en D1 (contraire au principe VIII).

## R12. Données transmises au fournisseur d'IA

- **Décision** :
  - Seuls sont envoyés l'occasion, la relation, la tranche de budget, les libellés des centres
    d'intérêt et la langue.
  - Aucun texte libre, aucune IP, aucun identifiant de visiteur.
  - La consigne système est fixe et versionnée dans `src/lib/generation/prompt.ts`.
- **Justification** : avec un référentiel fermé (R7), les données envoyées ne permettent pas
  d'identifier quelqu'un. C'est l'application directe du principe VIII et de FR-030.
- **À valider par le porteur avant la mise en ligne publique** : le principe VIII demande que
  les fournisseurs ne conservent ni ne réutilisent les données. Il faut relire la politique de
  conservation de l'API Anthropic et, si elle ne suffit pas, demander une conservation nulle
  (zero data retention). Le risque est faible, puisque aucune donnée personnelle n'est
  transmise.

## R13. Erreurs, délais et quota atteint

- **Décision** :
  - Au-delà de 20 secondes, le serveur abandonne et répond 504. Une erreur du fournisseur ou un
    refus non rattrapé donne 502.
  - L'îlot affiche alors un message et un bouton « Réessayer », sans effacer les critères ni la
    liste précédente.
  - Un quota atteint donne 429. Le bouton des résultats est remplacé par un message
    « Service limité, de nouveau disponible demain » (ou « le 1er du mois »).
  - Au chargement, `GET /api/status` donne l'état du quota, pour afficher ce message avant même
    un clic. Choix du porteur : message sur place.
- **Justification** : ISO 9241-11 (efficacité, satisfaction) demande que chaque erreur explique
  quoi faire ; FR-024 et FR-025.
- **Alternatives écartées** : page de maintenance pour tout le site (bloque aussi la saisie,
  alors que seule la génération est limitée).

## R14. Mesure de l'ergonomie (ISO 9241-11)

- **Décision** : les critères SC-001 à SC-004 sont mesurés par des tests utilisateurs encadrés
  (au moins 5 participants par langue), selon le protocole de [quickstart.md](./quickstart.md).
  L'accessibilité (contrastes, clavier, lecteurs d'écran) est vérifiée automatiquement par axe et
  par un parcours au clavier dans Playwright.
- **Justification** : le site ne collecte aucune mesure d'audience (principe VIII), donc la
  mesure se fait hors production.
- **Alternatives écartées** : sondage de satisfaction intégré au site (demanderait de conserver
  des réponses).

## R15. Dépôt et flux de travail git

- **Décision** :
  - Dépôt GitHub, branche `main` protégée, une branche par fonctionnalité
    (`001-questionnaire-idees-cadeaux`).
  - Un commit à la fin de chaque tâche de `tasks.md`.
  - Un modèle de PR (`.github/pull_request_template.md`) avec les cases de vérification de la
    constitution et la section du compte rendu des tests. Choix du porteur : GitHub.
- **Justification** : principe I et workflow de développement de la constitution.
- **Prérequis** : le dossier du projet n'est pas encore un dépôt git ; `git init` et la création
  du dépôt GitHub sont les premières tâches.

## R16. Nom de domaine

- **Décision** : le site démarre sur l'adresse gratuite `….workers.dev`. Un domaine `.fr` ou
  `.com` sera acheté plus tard ; 1,50 € par mois sont déjà réservés au budget (R4). Choix du
  porteur.
- **Justification** : rien ne bloque le développement, et le budget reste juste dès le départ.
