<!--
Sync Impact Report
==================
Version change: (template, non versionné) → 1.0.0
Principes définis (remplacent les placeholders du template) :
  - [PRINCIPLE_1_NAME] → I. Confidentialité par conception (NON NÉGOCIABLE)
  - [PRINCIPLE_2_NAME] → II. Neutralité des recommandations
  - [PRINCIPLE_3_NAME] → III. Web-first et multilingue
  - [PRINCIPLE_4_NAME] → IV. Ergonomie conforme ISO 9241-11
  - [PRINCIPLE_5_NAME] → V. Tests automatisés et qualité vérifiable
Principes ajoutés (au-delà du template) :
  - VI. Secrets hors du dépôt (NON NÉGOCIABLE)
  - VII. Maîtrise des coûts
Sections ajoutées :
  - Contraintes techniques et budgétaires (ex-[SECTION_2_NAME])
  - Workflow de développement (ex-[SECTION_3_NAME])
Sections supprimées : aucune
Templates dépendants : non modifiés (lus à l'exécution, hors périmètre de cette commande)
TODO différés : aucun
-->

# Constitution de Cadeaux App

## Core Principles

### I. Confidentialité par conception (NON NÉGOCIABLE)

- Aucune donnée utilisateur (paramètres saisis, résultats, historique) NE DOIT être conservée
  au-delà de la session de navigation. Pas de base de données d'utilisateurs, pas de comptes.
- Aucun cookie (y compris « techniques » de suivi), aucun outil d'analytics, aucun pixel ou
  traceur tiers NE DOIT être utilisé. L'état de session reste côté client (mémoire ou
  `sessionStorage`) et disparaît à la fermeture de l'onglet.
- Les adresses IP NE DOIVENT être ni journalisées ni stockées par l'application ; la
  configuration de l'hébergeur DOIT désactiver ou anonymiser les logs d'accès lorsque c'est
  possible, et ce choix DOIT être documenté.
- Les paramètres transmis à un service tiers (ex. API de génération) DOIVENT être limités au
  strict nécessaire et ne contenir aucune donnée identifiante.

**Justification** : la confiance de l'utilisateur et la conformité RGPD sont obtenues en ne
collectant rien, plutôt qu'en gérant des consentements.

### II. Neutralité des recommandations

- Les idées de cadeaux DOIVENT être générées uniquement à partir des paramètres saisis par
  l'utilisateur sur le site.
- Les liens d'affiliation PEUVENT être proposés pour une idée, mais leur présence, leur
  rémunération ou leur partenaire NE DOIVENT JAMAIS influencer l'ordre, le filtrage ni la
  sélection des idées affichées.
- Le classement DOIT être calculé avant toute association de liens d'affiliation, et cette
  séparation DOIT être couverte par un test automatisé.
- La nature affiliée d'un lien DOIT être signalée clairement à l'utilisateur.

**Justification** : la valeur du service repose sur la pertinence des idées, pas sur la
commission perçue.

### III. Web-first et multilingue

- L'application est conçue d'abord pour le navigateur web, responsive (mobile et bureau),
  sans installation requise.
- L'interface DOIT être disponible en français, anglais, espagnol et allemand (fr, en, es,
  de). Le français est la langue par défaut.
- Aucun texte visible NE DOIT être codé en dur : toutes les chaînes passent par le système
  d'internationalisation, et chaque clé DOIT exister dans les quatre langues.
- Les idées générées DOIVENT être présentées dans la langue d'interface active.
- Le choix de langue NE DOIT PAS être persisté par cookie (cf. principe I) ; il est déduit de
  l'URL ou de la préférence du navigateur.

### IV. Ergonomie conforme ISO 9241-11

- Chaque fonctionnalité DOIT viser l'utilisabilité au sens ISO 9241-11 : efficacité
  (l'utilisateur obtient des idées pertinentes), efficience (parcours court, peu d'étapes et
  de saisies) et satisfaction (interface claire, retours explicites).
- Chaque spécification DOIT définir des critères d'utilisabilité mesurables (ex. nombre
  d'étapes, temps pour obtenir une première idée, taux d'erreurs de saisie).
- Les erreurs, états de chargement et limites (ex. quota API atteint) DOIVENT être expliqués
  à l'utilisateur dans sa langue, avec une action possible.
- L'accessibilité (contrastes, navigation clavier, libellés de formulaires) fait partie
  intégrante de l'utilisabilité et DOIT être vérifiée.

### V. Tests automatisés et qualité vérifiable

- Toute fonctionnalité DOIT être couverte par des tests automatisés (unitaires et, pour les
  parcours utilisateur, tests de bout en bout).
- Les tests DOIVENT s'exécuter automatiquement (CI) sur chaque pull request.
- Le compte rendu des tests (résultats, couverture, éventuels échecs) DOIT figurer dans la
  description de la pull request avant toute fusion dans `main`.
- Une pull request dont les tests échouent NE DOIT PAS être fusionnée.

### VI. Secrets hors du dépôt (NON NÉGOCIABLE)

- Aucun secret (clés d'API, identifiants d'affiliation privés, jetons, mots de passe) NE DOIT
  apparaître dans le dépôt ni dans l'historique des commits.
- Les secrets sont fournis par variables d'environnement ou par le gestionnaire de secrets de
  l'hébergeur / de la CI. Seul un fichier d'exemple sans valeurs réelles (ex. `.env.example`)
  est versionné.
- Les fichiers de secrets locaux DOIVENT être listés dans `.gitignore`, et une vérification
  automatique (scan de secrets) DOIT bloquer tout commit ou PR contenant un secret.
- Tout secret exposé par erreur DOIT être révoqué et renouvelé immédiatement ; le retirer de
  l'historique ne suffit pas.

### VII. Maîtrise des coûts

- Le coût total d'exploitation NE DOIT PAS dépasser 20 € par mois, incluant hébergement,
  appels d'API payants et nom de domaine (ramené au mois).
- L'application DOIT intégrer une limitation des requêtes vers les API payantes (quota
  global journalier/mensuel) qui se déclenche avant le dépassement du budget ; une fois le
  quota atteint, les nouvelles générations sont refusées avec un message explicite.
- Cette limitation NE DOIT PAS reposer sur le stockage d'adresses IP ou d'identifiants
  utilisateur (cf. principe I).
- Tout choix de service ou de dépendance payante DOIT être accompagné d'une estimation de
  coût mensuel dans le plan d'implémentation.

## Contraintes techniques et budgétaires

- Budget mensuel plafond : 20 € TTC tout compris (hébergement + API payantes + domaine).
- Les solutions d'hébergement gratuites ou à faible coût sont privilégiées ; une alerte de
  dépense DOIT être configurée lorsque le fournisseur le permet.
- Langues supportées : fr (défaut), en, es, de.
- Aucune persistance serveur de données utilisateur ; aucun cookie ; aucun analytics ; aucune
  adresse IP conservée.
- Ergonomie : référentiel ISO 9241-11.
- Les dépendances tierces chargées côté client NE DOIVENT pas introduire de traceurs ni de
  cookies (polices, CDN et scripts compris).

## Workflow de développement

- Une branche par fonctionnalité, créée à partir de `main`.
- Un commit à la fin de chaque tâche (tâche issue de `tasks.md`), avec un message explicite.
- L'intégration dans `main` se fait exclusivement par pull request ; aucun push direct sur
  `main`.
- Avant fusion, la pull request DOIT :
  1. passer l'ensemble des tests automatisés ;
  2. contenir dans sa description le compte rendu des tests ;
  3. confirmer la conformité aux principes de cette constitution (confidentialité, neutralité,
     i18n complète, absence de secrets, impact budgétaire).

## Governance

- Cette constitution prévaut sur toute autre pratique ou convention du projet. En cas de
  conflit, elle s'applique.
- Toute modification DOIT être faite par pull request dédiée, documentant la justification, la
  nouvelle version et l'impact sur les fonctionnalités existantes (plan de migration si
  nécessaire).
- Versionnement sémantique :
  - MAJEUR : suppression ou redéfinition incompatible d'un principe ou d'une règle de
    gouvernance ;
  - MINEUR : ajout d'un principe ou d'une section, ou extension significative d'une règle ;
  - CORRECTIF : clarification, reformulation ou correction sans changement de sens.
- Chaque plan d'implémentation (`/speckit-plan`) DOIT inclure une vérification de conformité à
  la constitution ; toute dérogation DOIT être justifiée explicitement et approuvée.
- Chaque revue de pull request DOIT vérifier le respect des principes I à VII.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
