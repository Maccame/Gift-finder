# Feature Specification: Questionnaire guidé d'idées cadeaux

**Feature Branch**: `001-questionnaire-idees-cadeaux`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "L'utilisateur arrive sur le site internet avec un questionnaire guidé et avec des critères à paramétrer exemple dans un premier temps : l'occasion (noel, anniversaire...) puis la relation avec la personne ensuite le budget, et enfin des critères qu'on peut renseigner type \"musicien\" \"gamer\" \"aime les fleurs\"... Quand il a rentré ces critères, l'utilisateur peut cliquer sur un bouton pour afficher les résultats. Alors l'utilisateur aura une séléction avec un liste de cadeau qui apparaitra sur son écran avec les critères qui resteront modifiables mais la liste se raffraichira uniquement lors de la validation des critères par l'utilisateur pour éviter les appels API payants. Si l'utilisateur ne remplit pas assez les critères, il ne pourra pas valider les critères car le site lui obligera de mettre au moins 5 critères sur la derniere phase afin d'éviter une liste de cadeau trop générique, donc des appels API payants"

## Clarifications

### Session 2026-11-11

- Q: Les liens d'achat et l'affiliation font-ils partie de cette fonctionnalité ? → A: Oui : chaque idée a des liens de recherche marchands, et au plus 2 liens affiliés par sélection sont ajoutés après le classement et signalés.
- Q: Comment l'utilisateur renseigne-t-il les centres d'intérêt ? → A: Uniquement en les choisissant dans un référentiel traduit d'environ 150 centres d'intérêt, avec un champ de recherche ; pas de texte libre.
- Q: Combien d'idées par sélection ? → A: 6.
- Q: Que voit le visiteur quand le quota d'appels payants est atteint ? → A: Un message sur place ; le questionnaire reste utilisable et les critères sont conservés.
- Q: Vers quels marchands pointent les liens ? → A: Amazon (pays correspondant à la langue) et Etsy, en liens de recherche.

## User Scenarios & Testing *(mandatory)*

### Utilisateurs visés et contexte d'utilisation (ISO 9241-11)

- **Utilisateurs** : des particuliers qui cherchent un cadeau pour un proche et manquent d'idées,
  sans compétence technique particulière.
- **Objectif** : obtenir rapidement une sélection d'idées cadeaux adaptées à la personne, à
  l'occasion et à leur budget, et pouvoir les acheter.
- **Contexte** : sur ordinateur ou sur mobile, souvent dans un moment court (pause, transport,
  veille d'une fête), dans l'une des quatre langues du site (français par défaut, anglais,
  espagnol, allemand), sans compte et sans que rien ne soit conservé après la session.

### User Story 1 - Obtenir une sélection d'idées cadeaux via le questionnaire (Priority: P1)

L'utilisateur arrive sur le site et suit un questionnaire en quatre étapes, dans cet ordre :
l'occasion (Noël, anniversaire…), sa relation avec la personne (parent, ami, collègue…), le
budget, puis les centres d'intérêt de la personne (« musicien », « gamer », « aime les
fleurs »…), qu'il choisit dans une liste en les recherchant. À la dernière étape, il doit choisir
au moins 5 centres d'intérêt. Il clique ensuite sur le bouton qui affiche les résultats et voit
une sélection de 6 idées cadeaux.

**Why this priority**: c'est le parcours principal du site ; sans lui, le produit n'existe pas.
À lui seul, il apporte toute la valeur attendue : une liste d'idées adaptée.

**Independent Test**: peut être testé entièrement en remplissant les quatre étapes avec 5 centres
d'intérêt, en cliquant sur le bouton des résultats et en vérifiant que 6 idées cohérentes avec
l'occasion, la relation et le budget s'affichent.

**Acceptance Scenarios**:

1. **Given** un utilisateur qui arrive sur le site, **When** la page se charge, **Then** la
   première étape du questionnaire (l'occasion) s'affiche avec un indicateur de progression
   « étape 1 sur 4 ».
2. **Given** l'utilisateur à une étape du questionnaire, **When** il n'a pas encore répondu à
   cette étape, **Then** il ne peut pas passer à l'étape suivante et le site lui indique ce qui
   manque.
3. **Given** l'utilisateur à l'étape 2, 3 ou 4, **When** il revient à une étape précédente,
   **Then** ses réponses déjà saisies sont conservées.
4. **Given** l'utilisateur à la dernière étape, **When** il tape quelques lettres dans le champ de
   recherche (ex. « mus »), **Then** les centres d'intérêt correspondants s'affichent
   (ex. « Musicien », « Musées »), sans tenir compte des majuscules ni des accents.
5. **Given** l'utilisateur à la dernière étape avec 4 centres d'intérêt ou moins, **When** il
   regarde le bouton des résultats, **Then** le bouton est désactivé et un message indique
   combien de centres d'intérêt il reste à choisir (ex. « Encore 2 centres d'intérêt »).
6. **Given** l'utilisateur à la dernière étape avec au moins 5 centres d'intérêt, **When** il
   clique sur le bouton des résultats, **Then** une sélection de 6 idées cadeaux s'affiche,
   chacune avec un titre, une courte description, un prix indicatif et les centres d'intérêt
   auxquels elle répond.
7. **Given** une sélection affichée, **When** l'utilisateur la parcourt, **Then** chaque prix
   indicatif se situe dans la tranche de budget choisie.

---

### User Story 2 - Ajuster les critères depuis les résultats sans rafraîchissement involontaire (Priority: P2)

Sur la page des résultats, l'utilisateur voit à la fois la liste d'idées et ses critères, qui
restent modifiables : il peut changer l'occasion, la relation, le budget, ajouter ou retirer des
centres d'intérêt. La liste ne change pas pendant qu'il modifie les critères ; elle se met à
jour uniquement quand il valide explicitement ses nouveaux critères.

**Why this priority**: affiner sa recherche est le deuxième besoin le plus courant ; le fait de
ne rafraîchir qu'à la validation protège le budget d'exploitation du site (constitution,
principe V).

**Independent Test**: peut être testé en partant d'une liste affichée, en modifiant plusieurs
critères sans valider (la liste et le nombre de générations restent inchangés), puis en validant
(une seule nouvelle génération, liste mise à jour).

**Acceptance Scenarios**:

1. **Given** une liste affichée, **When** l'utilisateur modifie un ou plusieurs critères sans
   valider, **Then** la liste reste identique et aucune nouvelle génération n'est déclenchée.
2. **Given** des critères modifiés et non validés, **When** l'utilisateur regarde la page,
   **Then** un signal visible indique que la liste ne correspond plus aux critères affichés et
   qu'il faut valider pour la mettre à jour.
3. **Given** des critères modifiés et valides, **When** l'utilisateur clique sur le bouton de
   validation, **Then** une seule nouvelle génération est déclenchée et la liste est remplacée
   par une sélection correspondant aux nouveaux critères.
4. **Given** des critères identiques à ceux de la liste affichée, **When** l'utilisateur
   regarde le bouton de validation, **Then** le bouton est désactivé.
5. **Given** l'utilisateur sur la page des résultats, **When** il retire des centres d'intérêt
   jusqu'à en avoir moins de 5, **Then** le bouton de validation est désactivé avec le même
   message que dans le questionnaire.

---

### User Story 3 - Ouvrir un lien d'achat pour une idée (Priority: P3)

Pour chaque idée de la sélection, l'utilisateur peut ouvrir une recherche de produits
correspondants chez Amazon (dans le pays de sa langue) ou chez Etsy. Les liens affiliés sont
signalés comme tels, et leur présence ne change pas l'ordre des idées.

**Why this priority**: transforme une idée en achat et finance le site, mais la sélection
d'idées garde sa valeur sans les liens.

**Independent Test**: peut être testé en ouvrant les liens d'une sélection, en vérifiant qu'ils
mènent à une recherche pertinente chez le bon marchand, qu'au plus 2 sont signalés comme
affiliés, et que l'ordre des idées est identique avec et sans identifiant d'affiliation
configuré.

**Acceptance Scenarios**:

1. **Given** une sélection affichée, **When** l'utilisateur regarde une idée, **Then** elle
   propose un lien de recherche Amazon et un lien de recherche Etsy, qui s'ouvrent dans un
   nouvel onglet.
2. **Given** un utilisateur en français, allemand ou espagnol, **When** il ouvre un lien Amazon,
   **Then** il arrive sur l'Amazon du pays correspondant (France, Allemagne, Espagne) ; en
   anglais, sur Amazon Royaume-Uni.
3. **Given** un identifiant d'affiliation configuré, **When** la sélection s'affiche, **Then** au
   plus 2 liens sont affiliés, chacun signalé par une mention visible « lien affilié ».
4. **Given** les mêmes critères, **When** la sélection est produite avec et sans identifiant
   d'affiliation, **Then** l'ordre des idées est identique.
5. **Given** aucun identifiant d'affiliation configuré, **When** la sélection s'affiche,
   **Then** tous les liens sont des recherches neutres et aucune mention d'affiliation
   n'apparaît.

---

### User Story 4 - Utiliser le site dans sa langue (Priority: P3)

L'utilisateur utilise le questionnaire et lit les idées cadeaux en français, en anglais, en
espagnol ou en allemand. Sans choix de sa part, le site s'affiche en français.

**Why this priority**: exigé par la constitution (principe III) pour toucher un public européen,
mais le parcours reste démontrable en français seul.

**Independent Test**: peut être testé en parcourant le questionnaire dans chacune des quatre
langues et en vérifiant que tous les textes, les centres d'intérêt et les idées générées sont
dans la langue choisie.

**Acceptance Scenarios**:

1. **Given** un utilisateur sans préférence de langue reconnue, **When** il arrive sur le site,
   **Then** le site s'affiche en français.
2. **Given** l'utilisateur qui choisit l'anglais, l'espagnol ou l'allemand, **When** il parcourt
   le questionnaire, **Then** tous les textes, options, centres d'intérêt et messages sont dans
   cette langue.
3. **Given** une sélection générée, **When** l'utilisateur la lit, **Then** les idées sont
   rédigées dans la langue d'interface en vigueur au moment de la validation.
4. **Given** une liste affichée, **When** l'utilisateur change de langue, **Then** ses critères
   sont conservés, la liste n'est pas régénérée automatiquement et le site lui propose de valider
   pour obtenir les idées dans la nouvelle langue.

---

### Edge Cases

- **Recherche sans résultat** : si aucun centre d'intérêt ne correspond au texte tapé, le site
  l'indique et propose de parcourir la liste par catégorie.
- **Centre d'intérêt déjà choisi** : il n'apparaît plus dans les résultats de recherche et ne
  peut pas être ajouté deux fois.
- **Trop de centres d'intérêt** : au-delà de 10 centres d'intérêt, l'ajout est bloqué avec un
  message expliquant la limite.
- **Double clic sur le bouton des résultats ou de validation** : une seule génération est
  déclenchée ; le bouton est désactivé pendant le chargement.
- **Génération trop longue ou en échec** (réseau, service indisponible, au-delà de 20 secondes) :
  un message clair s'affiche avec un bouton « Réessayer », les critères sont conservés et la
  liste précédente reste visible s'il y en avait une.
- **Quota d'appels atteint** (constitution, principe V) : le questionnaire reste utilisable, le
  bouton des résultats est remplacé par un message indiquant que le service est limité et quand
  il sera de nouveau disponible ; les critères restent saisis.
- **Moins de 6 idées valides** : si certaines idées générées sont écartées (hors budget,
  doublon), le site affiche celles qui restent, sans case vide.
- **Idée hors budget** : une idée dont le prix indicatif sort de la tranche choisie n'est pas
  affichée.
- **Rechargement de la page pendant la session** : les critères saisis sont conservés tant que
  l'onglet reste ouvert ; à la fermeture de l'onglet, tout est effacé.
- **Aucune idée acceptable** : si le service de génération refuse ou ne produit aucune idée
  valide, un message invite à modifier les critères.

## Requirements *(mandatory)*

### Functional Requirements

**Questionnaire**

- **FR-001**: Le site DOIT présenter un questionnaire en quatre étapes, dans cet ordre : occasion,
  relation, budget, centres d'intérêt.
- **FR-002**: Le site DOIT afficher la progression dans le questionnaire (étape courante sur 4).
- **FR-003**: L'étape occasion DOIT proposer une liste de choix : Noël, anniversaire,
  Saint-Valentin, fête des mères, fête des pères, mariage, naissance, crémaillère, remerciement,
  autre.
- **FR-004**: L'étape relation DOIT proposer une liste de choix : conjoint ou partenaire, parent,
  enfant, frère ou sœur, grand-parent, ami, collègue, autre.
- **FR-005**: L'étape budget DOIT proposer des tranches en euros : moins de 20 €, 20 à 50 €, 50 à
  100 €, 100 à 200 €, plus de 200 €.
- **FR-006**: L'étape centres d'intérêt DOIT permettre de choisir des centres d'intérêt
  uniquement dans un référentiel d'environ 150 entrées traduites dans les quatre langues, grâce
  à un champ de recherche insensible aux majuscules et aux accents et à une navigation par
  catégorie ; aucun texte libre n'est accepté.
- **FR-007**: Le site DOIT exiger au moins 5 centres d'intérêt distincts et en accepter au
  plus 10.
- **FR-008**: Le site DOIT empêcher de passer à l'étape suivante tant que l'étape courante n'est
  pas remplie, et indiquer ce qui manque.
- **FR-009**: Le site DOIT permettre de revenir à une étape précédente sans perdre les réponses
  déjà saisies.
- **FR-010**: Le bouton qui affiche les résultats DOIT rester désactivé tant que les quatre étapes
  ne sont pas valides, et afficher le nombre de centres d'intérêt manquants.

**Résultats**

- **FR-011**: Au clic sur le bouton des résultats, le site DOIT générer et afficher une sélection
  de 6 idées cadeaux au plus correspondant aux critères saisis.
- **FR-012**: Chaque idée DOIT présenter un titre, une description courte (2 phrases au plus), un
  prix indicatif dans la tranche de budget choisie et les centres d'intérêt auxquels elle répond.
- **FR-013**: Les idées et leur ordre DOIVENT être déterminés uniquement à partir des critères
  saisis par l'utilisateur (constitution, principe VI).
- **FR-014**: Le site DOIT afficher un état de chargement pendant la génération, empêcher de
  lancer une seconde génération en parallèle, et abandonner la génération au-delà de
  20 secondes.

**Modification des critères**

- **FR-015**: La page des résultats DOIT afficher les critères en vigueur et permettre de tous les
  modifier.
- **FR-016**: Une modification des critères NE DOIT PAS déclencher de génération ; seule une
  validation explicite par l'utilisateur en déclenche une.
- **FR-017**: Le site DOIT signaler visiblement quand les critères affichés diffèrent de ceux qui
  ont produit la liste.
- **FR-018**: Le bouton de validation DOIT être désactivé quand les critères sont identiques à
  ceux de la liste affichée ou quand ils ne respectent pas FR-007.
- **FR-019**: Une validation DOIT déclencher une seule génération et remplacer la liste affichée.

**Liens d'achat et affiliation**

- **FR-020**: Chaque idée DOIT proposer un lien de recherche Amazon (Amazon France pour le
  français, Allemagne pour l'allemand, Espagne pour l'espagnol, Royaume-Uni pour l'anglais) et un
  lien de recherche Etsy, ouverts dans un nouvel onglet.
- **FR-021**: Les liens DOIVENT être ajoutés après que l'ordre des idées a été fixé ; ni leur
  présence ni leur affiliation ne DOIVENT modifier cet ordre.
- **FR-022**: Une sélection DOIT contenir au plus 2 liens affiliés : les liens Amazon des
  2 premières idées dans l'ordre déjà fixé, uniquement si un identifiant d'affiliation est
  configuré pour ce pays.
- **FR-023**: Chaque lien affilié DOIT être signalé par une mention visible « lien affilié »,
  et le site DOIT afficher la mention légale du programme d'affiliation quand il en utilise un.

**Budget d'exploitation et erreurs**

- **FR-024**: Le site DOIT respecter un quota journalier et un quota mensuel de générations qui
  garantissent le plafond de coût mensuel ; quand un quota est atteint, il DOIT remplacer le
  bouton des résultats par un message indiquant quand le service sera de nouveau disponible,
  sans perdre les critères (constitution, principe V).
- **FR-025**: En cas d'échec de génération, le site DOIT afficher un message compréhensible avec
  un bouton « Réessayer », conserver les critères et la liste précédente.

**Langues**

- **FR-026**: Tous les textes du questionnaire, des résultats, des messages et le référentiel des
  centres d'intérêt DOIVENT exister en français, anglais, espagnol et allemand, avec le français
  par défaut (constitution, principe III).
- **FR-027**: Les idées DOIVENT être générées dans la langue d'interface active au moment de la
  validation.
- **FR-028**: Un changement de langue NE DOIT PAS déclencher de génération automatique ; les
  critères sont conservés et le site propose de valider pour mettre à jour la liste.

**Confidentialité**

- **FR-029**: Les critères et la liste DOIVENT être conservés uniquement pendant la session de
  l'onglet et effacés à sa fermeture ; aucun cookie, aucune trace côté serveur liée à un
  visiteur et aucun outil de mesure d'audience (constitution, principe VIII).
- **FR-030**: Seuls les critères nécessaires à la génération (occasion, relation, budget, centres
  d'intérêt, langue) DOIVENT être transmis pour générer les idées.

### Key Entities *(include if feature involves data)*

- **Centre d'intérêt** : une entrée du référentiel (ex. « Musicien »), avec un identifiant
  stable, une catégorie et un libellé dans chacune des quatre langues.
- **Critères** : ce que l'utilisateur choisit pour décrire le cadeau recherché. Comprend
  l'occasion, la relation, la tranche de budget, de 5 à 10 centres d'intérêt et la langue.
  N'existe que pendant la session.
- **Idée cadeau** : une proposition affichée à l'utilisateur. Comprend un titre, une description
  courte, un prix indicatif, les centres d'intérêt auxquels elle répond et ses liens d'achat.
- **Lien d'achat** : une recherche chez un marchand (Amazon ou Etsy) pour une idée, affiliée ou
  non.
- **Sélection** : la liste ordonnée d'au plus 6 idées produite pour un jeu de critères validé.
  Une seule sélection est affichée à la fois ; elle est remplacée à chaque validation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Les critères SC-001 à SC-004 sont mesurés lors de tests utilisateurs encadrés (au moins
5 participants par langue), puisque le site ne collecte aucune mesure d'audience.

- **SC-001** (efficacité) : au moins 90 % des participants obtiennent une sélection d'idées dès
  leur premier passage dans le questionnaire, sans aide.
- **SC-002** (efficience) : la durée médiane entre l'arrivée sur le site et l'affichage de la
  première sélection est inférieure à 3 minutes.
- **SC-003** (satisfaction) : au moins 80 % des participants jugent qu'au moins 3 des 6 idées de
  la sélection sont pertinentes pour la personne décrite.
- **SC-004** (satisfaction) : au moins 80 % des participants comprennent, sans explication,
  pourquoi le bouton est désactivé avec moins de 5 centres d'intérêt.
- **SC-005** : 95 % des sélections s'affichent en moins de 10 secondes après le clic.
- **SC-006** : 100 % des idées affichées ont un prix indicatif dans la tranche de budget choisie.
- **SC-007** : le nombre de générations par session est égal au nombre de clics sur le bouton des
  résultats ou de validation ; modifier les critères ou changer de langue n'en déclenche aucune.
- **SC-008** : 100 % des textes de l'interface et des centres d'intérêt sont disponibles dans les
  quatre langues.
- **SC-009** : après fermeture de l'onglet, aucun critère ni aucune idée n'est retrouvable, ni
  dans le navigateur ni côté serveur.
- **SC-010** : pour 100 % des jeux de critères testés, l'ordre des idées est identique avec et
  sans identifiant d'affiliation configuré.
- **SC-011** : 100 % des sélections contiennent au plus 2 liens affiliés, tous signalés.
- **SC-012** : le coût d'exploitation mensuel reste sous 20 €, y compris le mois où les quotas
  sont atteints.

## Assumptions

- Le questionnaire ne demande ni l'âge ni le genre de la personne ; le référentiel peut contenir
  des centres d'intérêt qui les évoquent (ex. « Jeux pour enfants »).
- Les montants sont exprimés en euros dans les quatre langues.
- Le site est lancé sans compte d'affiliation : tant qu'aucun identifiant n'est configuré, tous
  les liens sont des recherches neutres.
- Il n'existe pas de bouton « d'autres idées » avec les mêmes critères ; obtenir une nouvelle
  sélection nécessite de modifier au moins un critère.
- Les valeurs exactes des quotas (FR-024) sont fixées dans le plan à partir du coût d'une
  génération et du plafond de 20 € par mois.
- Les idées sont générées par un service payant externe, dont le choix relève du plan.
- Aucun compte utilisateur n'est nécessaire.
