<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0 (MAJEURE : remplacement complet des principes)
- Principes supprimés :
  - I. Python 3.12 uniquement
  - II. Tests obligatoires avec pytest (NON NÉGOCIABLE)
  - III. Simplicité avant tout
  - IV. Code commenté en français
  - V. AWS minimaliste
- Principes ajoutés :
  - I. Une branche par fonctionnalité
  - II. Aucun secret dans le dépôt (NON NÉGOCIABLE)
  - III. Web first et multilingue
  - IV. Tests automatisés et compte rendu avant fusion (NON NÉGOCIABLE)
  - V. Budget plafonné à 20 € par mois
  - VI. Idées cadeaux neutres vis-à-vis de l'affiliation
  - VII. Ergonomie selon ISO 9241-11
  - VIII. Aucune donnée conservée au-delà de la session (NON NÉGOCIABLE)
- Sections renommées : Contraintes techniques → Contraintes d'exploitation
- Sections modifiées : Workflow de développement, Gouvernance
- Sections supprimées : aucune (les sections du modèle sont conservées)
- Interprétations à confirmer :
  - VI : la signalisation des liens d'affiliation est ajoutée (obligation légale de transparence)
  - V/VIII : des compteurs agrégés et anonymes (nombre d'appels, coût) sont autorisés pour
    faire respecter le budget, car ils ne contiennent aucune donnée utilisateur
  - VIII : la limitation de débit par client se fait en mémoire, sans persistance
- TODO différés : aucun
-->

# mon-projet Constitution

## Core Principles

### I. Une branche par fonctionnalité

- Chaque fonctionnalité DOIT être développée sur sa propre branche, créée depuis `main`.
- Aucun commit ne DOIT être poussé directement sur `main` ; une branche ne rejoint `main` que
  par une pull request.
- Un commit DOIT être créé à la fin de chaque tâche (`tasks.md`), avec un message qui nomme la
  tâche terminée.
- Une branche ne DOIT contenir qu'une seule fonctionnalité ; un travail sans rapport ouvre une
  autre branche.

**Justification** : un historique découpé par tâche et par fonctionnalité se relit, se teste et
s'annule facilement.

### II. Aucun secret dans le dépôt (NON NÉGOCIABLE)

- Aucun secret (clé d'API, mot de passe, jeton, identifiant d'affiliation privé, clé de
  chiffrement) ne DOIT figurer dans le code, la configuration versionnée ou un commit, même
  supprimé ensuite.
- Les secrets DOIVENT être fournis par des variables d'environnement ou un gestionnaire de
  secrets ; les fichiers qui les contiennent localement (ex. `.env`) DOIVENT être ignorés par
  git.
- Le dépôt PEUT contenir un fichier d'exemple (ex. `.env.example`) avec des valeurs factices.
- Un secret commité par erreur DOIT être révoqué et remplacé immédiatement ; le retirer de
  l'historique ne suffit pas.

**Justification** : un secret publié est compromis, quel que soit le temps passé en ligne.

### III. Web first et multilingue

- Le produit est d'abord un site web, utilisable dans un navigateur sans installation, sur
  ordinateur comme sur mobile.
- L'interface DOIT être disponible en français (`fr`), anglais (`en`), espagnol (`es`) et
  allemand (`de`).
- Le français DOIT être la langue par défaut, utilisée quand aucune autre langue n'est demandée.
- Aucun texte d'interface ne DOIT être écrit en dur dans le code : tous passent par des
  fichiers de traduction.
- Une fonctionnalité ne DOIT pas être fusionnée tant que ses textes ne sont pas traduits dans
  les quatre langues.
- Les idées cadeaux générées DOIVENT être rédigées dans la langue d'interface choisie.
- Le choix de langue DOIT être porté par l'URL ou par le navigateur, jamais par un cookie
  (voir principe VIII).

**Justification** : le site vise un public européen ; une traduction partielle casse
l'expérience dans les langues secondaires.

### IV. Tests automatisés et compte rendu avant fusion (NON NÉGOCIABLE)

- Toute fonctionnalité et toute correction de bug DOIVENT être couvertes par des tests
  automatisés.
- Une correction de bug DOIT inclure un test qui reproduit le bug.
- Les tests DOIVENT s'exécuter par une seule commande documentée, sans action manuelle.
- Avant toute fusion dans `main`, la description de la pull request DOIT contenir un compte
  rendu des tests : commande lancée, date, nombre de tests réussis, échoués et ignorés.
- Une pull request dont un test échoue ne DOIT pas être fusionnée.
- Les services payants (API de génération, plateformes d'affiliation) DOIVENT être simulés
  dans les tests ; aucun test ne consomme le budget du principe V.

**Justification** : le compte rendu rend la qualité vérifiable au moment de la décision de
fusion, et pas seulement en théorie.

### V. Budget plafonné à 20 € par mois

- Le coût total d'exploitation NE DOIT PAS dépasser 20 € par mois, toutes charges comprises :
  hébergement, appels d'API payants et nom de domaine (ramené au mois).
- Chaque plan (`plan.md`) DOIT estimer le coût mensuel de la fonctionnalité et montrer que le
  total reste sous le plafond.
- Le site DOIT appliquer une limite d'appels aux API payantes, calculée pour tenir le budget.
- Quand la limite est atteinte, le site DOIT réduire ou suspendre les requêtes payantes et
  afficher un message clair à l'utilisateur, plutôt que dépasser le budget.
- Le suivi du budget PEUT utiliser des compteurs agrégés et anonymes (nombre d'appels, coût
  estimé), qui ne contiennent aucune donnée utilisateur (voir principe VIII).

**Justification** : le projet est autofinancé ; un dépassement de coût ne doit jamais dépendre
d'une surveillance manuelle.

### VI. Idées cadeaux neutres vis-à-vis de l'affiliation

- Les idées cadeaux DOIVENT être générées uniquement à partir des paramètres saisis par
  l'utilisateur sur le site.
- L'ordre de présentation des idées DOIT être déterminé sans tenir compte de l'existence, du
  taux ou du montant d'un lien d'affiliation.
- Les liens d'affiliation sont ajoutés aux idées une fois l'ordre fixé ; une idée sans lien
  d'affiliation n'est ni rétrogradée ni retirée.
- Un test automatisé DOIT vérifier que l'ordre des idées est identique avec et sans liens
  d'affiliation pour les mêmes paramètres.
- Les liens d'affiliation DOIVENT être signalés comme tels à l'utilisateur.

**Justification** : la valeur du site repose sur la confiance ; une recommandation orientée par
la commission trahirait l'utilisateur.

### VII. Ergonomie selon ISO 9241-11

- Le site DOIT être conçu selon la norme ISO 9241-11 : l'utilisabilité est mesurée par
  l'efficacité, l'efficience et la satisfaction des utilisateurs visés, dans leur contexte
  d'utilisation.
- Chaque spécification (`spec.md`) DOIT décrire les utilisateurs visés, leurs objectifs et leur
  contexte d'utilisation (appareil, situation, langue).
- Chaque spécification DOIT fixer des critères mesurables pour :
  - l'efficacité (ex. part des utilisateurs qui obtiennent une idée cadeau pertinente) ;
  - l'efficience (ex. nombre d'étapes ou temps pour obtenir des idées) ;
  - la satisfaction (ex. retour explicite de l'utilisateur pendant la session).
- Ces critères DOIVENT être vérifiés avant de déclarer la fonctionnalité terminée.

**Justification** : une norme mesurable remplace les avis subjectifs sur l'ergonomie par des
critères vérifiables.

### VIII. Aucune donnée conservée au-delà de la session (NON NÉGOCIABLE)

- Aucune donnée liée à un utilisateur ne DOIT être conservée après la fin de sa session :
  ni paramètres saisis, ni idées générées, ni adresse IP.
- Le site NE DOIT déposer aucun cookie, y compris technique.
- Le stockage côté navigateur est limité à la durée de la session (ex. `sessionStorage`) ;
  `localStorage`, IndexedDB et tout stockage persistant sont interdits.
- Le serveur NE DOIT écrire aucun journal (logs) de requêtes ou d'utilisateurs ; la
  journalisation par défaut des hébergeurs et services DOIT être désactivée.
- Aucun outil d'analytics, de mesure d'audience ou de pistage tiers ne DOIT être intégré.
- Les paramètres envoyés aux API de génération ne DOIVENT contenir que le strict nécessaire, et
  les fournisseurs retenus DOIVENT ne pas conserver ni réutiliser ces données.
- La limitation de débit par client, si elle est nécessaire, DOIT se faire en mémoire, sans
  persistance.

**Justification** : ne rien conserver est la seule garantie qu'aucune donnée ne fuite, et cela
dispense de bannière de consentement.

## Contraintes d'exploitation

- Plafond de coût : 20 € par mois, hébergement, API payantes et nom de domaine compris
  (principe V).
- Langues : `fr` (par défaut), `en`, `es`, `de` (principe III).
- Confidentialité : aucun cookie, aucun log serveur, aucun analytics, aucune donnée persistée
  au-delà de la session (principe VIII).
- Secrets : variables d'environnement ou gestionnaire de secrets, jamais dans le dépôt
  (principe II).
- Les choix de langage, de framework et d'hébergeur sont libres, à condition de respecter ces
  contraintes ; chaque plan DOIT les justifier.

## Workflow de développement

- Chaque fonctionnalité suit le cycle Spec Kit : spécification → plan → tâches → implémentation.
- Le cycle se déroule sur une branche dédiée (principe I), avec un commit à la fin de chaque
  tâche.
- Le plan (`plan.md`) DOIT contenir une vérification de conformité à cette constitution
  (Constitution Check), une estimation du coût mensuel (principe V) et la justification de
  toute exception.
- Avant fusion dans `main`, la pull request DOIT montrer :
  - le compte rendu des tests, tous au vert (principe IV) ;
  - les textes traduits dans les quatre langues (principe III) ;
  - l'absence de secret, de cookie, de log et d'analytics ajoutés (principes II et VIII) ;
  - les critères d'ergonomie de la spécification vérifiés (principe VII).

## Governance

- Cette constitution prévaut sur toute autre pratique du projet.
- Toute modification DOIT être documentée (motif, impact), approuvée par le responsable du
  projet, et accompagnée si nécessaire d'un plan de migration.
- Versionnage sémantique :
  - MAJEURE : suppression ou redéfinition incompatible d'un principe ;
  - MINEURE : ajout d'un principe ou d'une section, ou extension notable des règles ;
  - CORRECTIF : clarifications et reformulations sans changement de sens.
- Chaque plan et chaque revue de pull request DOIVENT vérifier la conformité aux principes
  ci-dessus ; un écart non justifié bloque la fusion.

**Version**: 2.0.0 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-11
