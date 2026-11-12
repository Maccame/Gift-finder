<!--
Sync Impact Report
- Version change: 1.0.0 → 2.1.0 (MAJEURE : principes renumérotés et redéfinis)
- Contexte : une v2.0.0 rédigée le 2026-11-11 sur une copie locale n'a jamais été fusionnée
  dans `main`. Cette v2.1.0 fusionne la v1.0.0 de `main` et cette v2.0.0.
- Principes renommés et renumérotés (ancien → nouveau) :
  - I. Confidentialité par conception → VIII. Aucune donnée conservée au-delà de la session
  - II. Neutralité des recommandations → VI. Idées cadeaux neutres vis-à-vis de l'affiliation
  - III. Web-first et multilingue → III. Web first et multilingue
  - IV. Ergonomie conforme ISO 9241-11 → VII. Ergonomie selon ISO 9241-11
  - V. Tests automatisés et qualité vérifiable → IV. Tests automatisés et compte rendu avant
    fusion
  - VI. Secrets hors du dépôt → II. Aucun secret dans le dépôt
  - VII. Maîtrise des coûts → V. Budget plafonné à 20 € par mois
- Principes ajoutés :
  - I. Une branche par fonctionnalité (auparavant dans le Workflow de développement)
- Règles ajoutées par rapport à la v1.0.0 :
  - III : pas de fusion tant que les 4 traductions ne sont pas complètes
  - IV : test qui reproduit chaque bug corrigé ; services payants simulés dans les tests ;
    une seule commande pour lancer les tests
  - V : compteurs agrégés et anonymes autorisés pour faire respecter le budget
  - VII : utilisateurs, objectifs et contexte décrits dans chaque spec, critères mesurables
    pour l'efficacité, l'efficience et la satisfaction
  - VIII : `localStorage` et IndexedDB interdits ; journaux de l'hébergeur désactivés (un cas
    impossible doit être documenté et validé) ; limitation de débit en mémoire seulement ;
    fournisseurs qui ne conservent ni ne réutilisent les données
- Sections renommées : Contraintes techniques et budgétaires → Contraintes d'exploitation
- Sections modifiées : Workflow de développement, Gouvernance
- Sections supprimées : aucune
- Interprétations à confirmer :
  - V/VIII : les compteurs agrégés et anonymes (nombre d'appels, coût) ne sont pas des données
    utilisateur
  - VIII : une règle anti-abus de l'hébergeur à compteurs éphémères vaut limitation « en
    mémoire, sans persistance »
- Dépendants : `specs/001-questionnaire-idees-cadeaux/plan.md` (Constitution Check à
  passer en v2.1.0) ; le compte rendu de tests du plan (research R9) doit ajouter la couverture
- TODO différés : aucun
-->

# Constitution de Cadeaux App

## Core Principles

### I. Une branche par fonctionnalité

- Chaque fonctionnalité DOIT être développée sur sa propre branche, créée depuis `main`.
- Aucun commit ne DOIT être poussé directement sur `main` ; une branche ne rejoint `main` que
  par une pull request.
- Un commit DOIT être créé à la fin de chaque tâche (`tasks.md`), avec un message explicite qui
  nomme la tâche terminée.
- Une branche ne DOIT contenir qu'une seule fonctionnalité ; un travail sans rapport ouvre une
  autre branche.

**Justification** : un historique découpé par tâche et par fonctionnalité se relit, se teste et
s'annule facilement.

### II. Aucun secret dans le dépôt (NON NÉGOCIABLE)

- Aucun secret (clé d'API, mot de passe, jeton, identifiant d'affiliation privé, clé de
  chiffrement) ne DOIT figurer dans le code, la configuration versionnée ou l'historique des
  commits, même supprimé ensuite.
- Les secrets DOIVENT être fournis par des variables d'environnement ou par le gestionnaire de
  secrets de l'hébergeur ou de la CI.
- Les fichiers de secrets locaux (ex. `.env`, `.dev.vars`) DOIVENT être listés dans
  `.gitignore`. Seul un fichier d'exemple aux valeurs factices (ex. `.env.example`) PEUT être
  versionné.
- Un scan de secrets automatique DOIT bloquer tout commit et toute pull request qui contient un
  secret.
- Un secret exposé par erreur DOIT être révoqué et renouvelé immédiatement ; le retirer de
  l'historique ne suffit pas.

**Justification** : un secret publié est compromis, quel que soit le temps passé en ligne.

### III. Web first et multilingue

- Le produit est d'abord un site web responsive, utilisable dans un navigateur sans
  installation, sur ordinateur comme sur mobile.
- L'interface DOIT être disponible en français (`fr`), anglais (`en`), espagnol (`es`) et
  allemand (`de`).
- Le français DOIT être la langue par défaut, utilisée quand aucune autre langue n'est demandée.
- Aucun texte visible ne DOIT être écrit en dur dans le code : toutes les chaînes passent par
  le système d'internationalisation, et chaque clé DOIT exister dans les quatre langues.
- Une fonctionnalité ne DOIT pas être fusionnée tant que ses textes ne sont pas traduits dans
  les quatre langues.
- Les idées cadeaux générées DOIVENT être présentées dans la langue d'interface active.
- Le choix de langue DOIT être porté par l'URL ou par la préférence du navigateur, jamais par
  un cookie (voir principe VIII).

**Justification** : le site vise un public européen ; une traduction partielle casse
l'expérience dans les langues secondaires.

### IV. Tests automatisés et compte rendu avant fusion (NON NÉGOCIABLE)

- Toute fonctionnalité DOIT être couverte par des tests automatisés : des tests unitaires et,
  pour les parcours utilisateur, des tests de bout en bout.
- Une correction de bug DOIT inclure un test qui reproduit le bug.
- Les tests DOIVENT s'exécuter par une seule commande documentée, et automatiquement en CI sur
  chaque pull request.
- Avant toute fusion dans `main`, la description de la pull request DOIT contenir un compte
  rendu des tests : commande lancée, date, nombre de tests réussis, échoués et ignorés, et
  couverture.
- Une pull request dont un test échoue ne DOIT pas être fusionnée.
- Les services payants (API de génération, plateformes d'affiliation) DOIVENT être simulés
  dans les tests ; aucun test ne consomme le budget du principe V.

**Justification** : le compte rendu rend la qualité vérifiable au moment de la décision de
fusion, et pas seulement en théorie.

### V. Budget plafonné à 20 € par mois

- Le coût total d'exploitation NE DOIT PAS dépasser 20 € TTC par mois, toutes charges
  comprises : hébergement, appels d'API payants et nom de domaine (ramené au mois).
- Chaque plan (`plan.md`) DOIT estimer le coût mensuel de tout service ou dépendance payante
  et montrer que le total reste sous le plafond.
- Le site DOIT appliquer un quota global, journalier et mensuel, d'appels aux API payantes,
  calculé pour se déclencher avant le dépassement du budget.
- Quand le quota est atteint, le site DOIT suspendre les requêtes payantes et afficher un
  message clair à l'utilisateur, plutôt que dépasser le budget.
- Le quota NE DOIT PAS reposer sur le stockage d'adresses IP ou d'identifiants d'utilisateur ;
  il PEUT utiliser des compteurs agrégés et anonymes (nombre d'appels, coût estimé), qui ne
  contiennent aucune donnée utilisateur (voir principe VIII).
- Une alerte de dépense DOIT être configurée chez chaque fournisseur payant qui le permet.

**Justification** : le projet est autofinancé ; un dépassement de coût ne doit jamais dépendre
d'une surveillance manuelle.

### VI. Idées cadeaux neutres vis-à-vis de l'affiliation

- Les idées cadeaux DOIVENT être générées uniquement à partir des paramètres saisis par
  l'utilisateur sur le site.
- La présence d'un lien d'affiliation, sa rémunération ou son partenaire NE DOIVENT jamais
  influencer l'ordre, le filtrage ni la sélection des idées affichées.
- Le classement DOIT être calculé avant toute association de liens d'affiliation ; une idée
  sans lien d'affiliation n'est ni rétrogradée ni retirée.
- Un test automatisé DOIT vérifier que l'ordre des idées est identique avec et sans liens
  d'affiliation pour les mêmes paramètres.
- Les liens d'affiliation DOIVENT être signalés clairement comme tels à l'utilisateur.

**Justification** : la valeur du site repose sur la pertinence et la confiance ; une
recommandation orientée par la commission trahirait l'utilisateur.

### VII. Ergonomie selon ISO 9241-11

- Le site DOIT être conçu selon la norme ISO 9241-11 : l'utilisabilité est mesurée par
  l'efficacité, l'efficience et la satisfaction des utilisateurs visés, dans leur contexte
  d'utilisation.
- Chaque spécification (`spec.md`) DOIT décrire les utilisateurs visés, leurs objectifs et leur
  contexte d'utilisation (appareil, situation, langue).
- Chaque spécification DOIT fixer des critères mesurables pour :
  - l'efficacité (ex. part des utilisateurs qui obtiennent une idée cadeau pertinente) ;
  - l'efficience (ex. nombre d'étapes, temps pour obtenir une première idée, taux d'erreurs de
    saisie) ;
  - la satisfaction (ex. retour explicite de l'utilisateur pendant la session).
- Les erreurs, états de chargement et limites (ex. quota atteint) DOIVENT être expliqués à
  l'utilisateur dans sa langue, avec une action possible.
- L'accessibilité (contrastes, navigation au clavier, libellés de formulaires) fait partie de
  l'utilisabilité et DOIT être vérifiée.
- Ces critères DOIVENT être vérifiés avant de déclarer la fonctionnalité terminée.

**Justification** : une norme mesurable remplace les avis subjectifs sur l'ergonomie par des
critères vérifiables.

### VIII. Aucune donnée conservée au-delà de la session (NON NÉGOCIABLE)

- Aucune donnée liée à un utilisateur ne DOIT être conservée après la fin de sa session :
  ni paramètres saisis, ni idées générées, ni historique, ni adresse IP. Pas de compte ni de
  base de données d'utilisateurs.
- Le site NE DOIT déposer aucun cookie, y compris technique.
- Le stockage côté navigateur est limité à la mémoire et à la durée de la session (ex.
  `sessionStorage`) ; `localStorage`, IndexedDB et tout stockage persistant sont interdits.
- Le serveur NE DOIT écrire aucun journal de requêtes ou d'utilisateurs, et la journalisation
  par défaut des hébergeurs et services DOIT être désactivée. Si un service ne permet pas de
  la désactiver, ce point DOIT être documenté dans le plan et validé par le responsable du
  projet.
- Aucun outil d'analytics, de mesure d'audience, pixel ou traceur tiers ne DOIT être intégré.
- Les dépendances chargées côté client (polices, CDN, scripts) NE DOIVENT introduire ni traceur
  ni cookie.
- Les paramètres envoyés à un service tiers (ex. API de génération) DOIVENT se limiter au strict
  nécessaire, sans donnée identifiante, et les fournisseurs retenus DOIVENT ne pas conserver
  ni réutiliser ces données.
- La limitation de débit par client, si elle est nécessaire, DOIT se faire en mémoire, sans
  persistance.

**Justification** : ne rien collecter est la seule garantie qu'aucune donnée ne fuite ; la
conformité RGPD est obtenue sans bannière de consentement.

## Contraintes d'exploitation

- Plafond de coût : 20 € TTC par mois, hébergement, API payantes et nom de domaine compris ; les
  hébergements gratuits ou à faible coût sont privilégiés (principe V).
- Langues : `fr` (par défaut), `en`, `es`, `de` (principe III).
- Confidentialité : aucun cookie, aucun journal serveur, aucun analytics, aucune adresse IP ni
  donnée persistée au-delà de la session (principe VIII).
- Secrets : variables d'environnement ou gestionnaire de secrets, scan automatique, jamais dans
  le dépôt (principe II).
- Ergonomie : ISO 9241-11, accessibilité comprise (principe VII).
- Les choix de langage, de framework et d'hébergeur sont libres, à condition de respecter ces
  contraintes ; chaque plan DOIT les justifier.

## Workflow de développement

- Chaque fonctionnalité suit le cycle Spec Kit : spécification → plan → tâches → implémentation.
- Le cycle se déroule sur une branche dédiée (principe I), avec un commit à la fin de chaque
  tâche.
- Le plan (`plan.md`) DOIT contenir une vérification de conformité à cette constitution
  (Constitution Check), une estimation du coût mensuel (principe V) et la justification de
  toute exception.
- Avant fusion dans `main`, la pull request DOIT :
  1. passer l'ensemble des tests automatisés, et contenir leur compte rendu dans sa description
     (principe IV) ;
  2. fournir les textes dans les quatre langues (principe III) ;
  3. confirmer l'absence de secret, de cookie, de journal, d'analytics et de traceur ajoutés
     (principes II et VIII) ;
  4. confirmer la neutralité de l'affiliation et l'impact budgétaire (principes V et VI) ;
  5. confirmer que les critères d'ergonomie et d'accessibilité de la spec sont vérifiés
     (principe VII).

## Governance

- Cette constitution prévaut sur toute autre pratique ou convention du projet ; en cas de
  conflit, elle s'applique.
- Toute modification DOIT passer par une pull request dédiée qui documente le motif, la
  nouvelle version et l'impact sur les fonctionnalités existantes, avec un plan de migration si
  nécessaire. Elle DOIT être approuvée par le responsable du projet.
- Versionnage sémantique :
  - MAJEURE : suppression ou redéfinition incompatible d'un principe ou d'une règle de
    gouvernance ;
  - MINEURE : ajout d'un principe ou d'une section, ou extension notable d'une règle ;
  - CORRECTIF : clarification, reformulation ou correction sans changement de sens.
- Chaque plan d'implémentation DOIT vérifier la conformité à cette constitution ; toute
  dérogation DOIT être justifiée explicitement et approuvée.
- Chaque revue de pull request DOIT vérifier le respect des principes I à VIII ; un écart non
  justifié bloque la fusion.

**Version**: 2.1.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-12
