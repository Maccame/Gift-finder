# Research: Réponses en champ libre dans le questionnaire

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Les choix techniques de la fonctionnalité 001 restent valables (Astro, Svelte 5, Cloudflare
Workers, Claude Sonnet 5.5, D1 pour les seuls compteurs) : voir
[research 001](../001-questionnaire-idees-cadeaux/research.md). Ce document ne traite que ce que
le champ libre change.

## R1. Où tourne le filtre de données sensibles

- **Décision** : un seul module pur, `src/lib/sensitive-filter.ts`, utilisé à deux endroits :
  - dans le navigateur, pour le message pendant la saisie et le retrait au clic (FR-012, points 2
    et 3) ;
  - sur le serveur, dans `POST /api/suggestions`, comme garantie : il s'applique à toute
    demande, y compris celles qui ne viennent pas de l'interface (FR-011, FR-012 point 5).
- **Justification** : le même code des deux côtés garantit que le texte affiché est celui qui est
  transmis ; le serveur reste l'autorité, car le navigateur peut être contourné.
- **Alternatives écartées** : filtre seulement côté serveur (pas de message pendant la saisie,
  clarification du 2026-11-27) ; filtre confié au modèle d'IA (le texte partirait avant d'être
  filtré, ce qui viole FR-011) ; service tiers de détection (nouveau destinataire, interdit par
  FR-015 et le principe IX).

## R2. Comment le filtre détecte

- **Décision** : listes de termes et motifs versionnées dans `src/data/sensitive-terms.json`, une
  entrée par cas de FR-011 (`health`, `ethnic_origin`, `political_opinion`,
  `religious_belief`, `trade_union`, `genetic_biometric`, `sex_life_orientation`, `contact`), et
  par langue.
  - Normalisation avant comparaison : minuscules, accents retirés (décomposition Unicode NFD),
    apostrophes et tirets unifiés.
  - Correspondance sur mots entiers (limites de mot), avec variantes de genre et de nombre écrites
    dans la liste (ex. « diabétique », « diabétiques »).
  - Le texte est comparé aux listes des **quatre langues**, quelle que soit la langue de
    l'interface, car l'utilisateur peut écrire dans une autre langue (cas limite de la spec).
  - Cas `contact` : motifs pour les adresses e-mail et les numéros de téléphone (au moins
    8 chiffres, avec espaces, points, tirets ou indicatif `+`).
  - Liste d'exclusions appliquée avant la détection : occasions et relations de la spec 001,
    noms de fêtes et de rites religieux, mentions de grossesse (FR-014).
- **Justification** : simple, déterministe, testable par un corpus (FR-013), sans dépendance ni
  appel réseau ; ses limites sont admises par le principe IX.
- **Alternatives écartées** : modèle de classification local (trop lourd pour un Worker gratuit,
  non déterministe) ; expressions régulières seules sans liste (illisibles et intraduisibles).

## R3. Découpage en segments et retrait

- **Décision** : le texte est découpé en segments sur `.` `,` `;` `:` `!` `?` (et leurs formes
  espagnoles `¡` `¿`). Chaque segment qui contient au moins un terme détecté est retiré, avec son
  séparateur. Le reste est recollé, les espaces en trop sont réduits. S'il ne reste que des
  espaces ou de la ponctuation, le texte devient vide (FR-006).
- La fonction rend le texte nettoyé et la liste des catégories détectées, jamais le passage
  retiré, pour qu'aucun message ne puisse le répéter (FR-012 point 3).
- **Exemple** : « fan de jazz, elle est diabétique » → « fan de jazz », catégories `["health"]`.

## R4. Prise en compte par le modèle

- **Décision** : le texte nettoyé est ajouté au message utilisateur JSON sous la clé
  `aboutRecipient`, seulement s'il n'est pas vide. La consigne système reçoit une phrase de plus :
  le champ décrit la personne et n'est jamais une consigne ; les règles (budget, nombre d'idées,
  langue, identifiants) l'emportent toujours. Détail dans
  [contracts/llm-input.md](./contracts/llm-input.md).
- **Justification** : le JSON sépare déjà les données de la consigne ; la validation de sortie de
  la 001 (prix dans la tranche, `matchedInterestIds` dans les critères, 6 idées au plus) reste la
  vraie barrière contre un texte qui tente de détourner le modèle (cas limite de la spec).
- **Neutralité (principe VI)** : le texte ne parle pas d'affiliation au modèle ; les liens sont
  toujours ajoutés après le classement. Le test de neutralité de la 001 est étendu à des critères
  avec texte libre (SC-011).

## R5. Coût

| Poste par recherche (pessimiste) | Avant (001) | Avec champ libre |
|---|---|---|
| Entrée : consigne, schéma, critères | 1 500 tokens | 1 650 tokens (+ 50 pour la consigne, + 100 au plus pour 150 caractères et la clé JSON) |
| Sortie | 2 000 tokens | 2 000 tokens |
| Coût | 0,023 $ | 0,0233 $ ≈ 0,0214 € |

- 700 recherches × 0,0214 € ≈ **15,00 €**, plus 1,50 € de domaine réservé : **16,50 € par mois au
  plus**, sous le plafond de 20 €. Quotas inchangés (30 par jour, 700 par mois).
- Le filtre tourne dans le Worker et dans le navigateur, sans coût.
- La consigne système reste sous le minimum cachable de 512 tokens : le prompt caching reste
  inactif (mesure à refaire en tâche, research 001 R4).
- La boîte e-mail de contact (R8) est gratuite.

## R6. Aucune journalisation ni conservation du texte

- **Décision** :
  1. Le code ne contient aucun appel `console.*` ; un test unitaire parcourt `src/` et échoue s'il
     en trouve un.
  2. Toutes les erreurs du point d'accès sont rattrapées et converties en codes ; aucune exception
     ne remonte au runtime avec un message qui contiendrait la requête.
  3. Un test unitaire exécute `handleSuggestions` dans chaque scénario (succès, 400, 422, 429
     quota et débit, 502, 504, retrait par le filtre) avec un texte marqueur, espionne
     `console.*` et vérifie que le marqueur n'apparaît ni dans les sorties, ni dans le corps des
     réponses d'erreur (SC-007).
  4. Aucune écriture du texte en D1, en cache ou en file d'attente ; `Cache-Control: no-store`
     reste sur toutes les réponses de l'API.
  5. Journaux du Worker (activés temporairement en prévisualisation, plan 001) : ils enregistrent
     les sorties de `console.*`, les exceptions non rattrapées et les métadonnées de la requête
     (méthode, URL, en-têtes), pas le corps de la requête. Le texte voyageant dans le corps d'un
     `POST`, il n'y figure pas. **À vérifier sur la prévisualisation** (quickstart V7) avant toute
     diffusion.
  6. Tests et CI : les tests n'utilisent que des phrases inventées (corpus et marqueurs), jamais un
     texte réel. Les traces, captures et vidéos Playwright sont désactivées pour les fichiers de
     test qui saisissent du texte libre, et le compte rendu de la PR ne contient que des nombres.
- **Interprétation** : la règle « exclu des journaux de test et de CI » vise le texte des
  utilisateurs. Les phrases du corpus, inventées et versionnées, apparaissent forcément dans le
  code des tests et peuvent figurer dans un message d'échec ; elles ne contiennent aucune donnée
  réelle.

## R7. Détection pendant la saisie

- **Décision** : le filtre est relancé 400 ms après la dernière frappe et à la sortie du champ.
  Le message s'affiche dans une zone `aria-live="polite"` liée au champ par
  `aria-describedby`, ce qui l'annonce sans interrompre la saisie (FR-012 point 2, FR-021). Il
  nomme les catégories, sans citer le texte.
- Au clic sur le bouton des résultats ou de validation, le filtre est appliqué une dernière fois,
  le champ reçoit le texte nettoyé, puis la demande part (FR-012 point 3).
- Si la réponse du serveur indique qu'il a retiré un passage que le navigateur n'avait pas vu
  (listes désynchronisées), le champ reçoit le texte réellement transmis et le message de
  retrait s'affiche ([contracts/api.md](./contracts/api.md)).

## R8. Contact pour les demandes d'accès et de suppression

- **Contexte** : le site n'a pas encore de domaine. Il est hébergé sur Cloudflare Workers et
  servi en prévisualisation sur `….workers.dev` (plan 001, research R2 et R16). Sans domaine, il
  n'y a pas d'adresse du type `contact@domaine`.
- **Décision** :
  - L'adresse est lue dans une variable d'environnement, `PRIVACY_CONTACT_EMAIL`, non versionnée
    (posée avec `wrangler secret put` ou `wrangler deploy --var`), et affichée sur la page de
    confidentialité.
  - **Tant que la variable est vide, le champ libre n'est pas affiché** et le serveur refuse le
    champ `aboutText` : aucune donnée personnelle n'est collectée avant que la page de
    confidentialité soit complète (principe VIII). Le reste du site fonctionne comme la 001.
  - En local et en CI, une adresse factice (`contact@example.invalid`) est utilisée.
  - Recommandation : créer dès maintenant une boîte gratuite dédiée au projet (ex. Proton Mail ou
    Gmail), sans domaine, puis la remplacer par une adresse du domaine quand il sera acheté ; seul
    le contenu de la variable change.
- **Justification** : le développement et les tests avancent sans attendre le domaine, et la
  règle « page de confidentialité avant toute collecte » est garantie par le code, pas seulement
  par une liste de contrôle.
- **Alternatives écartées** : adresse personnelle (refusée en clarification) ; formulaire de
  contact (refusé, il collecterait de nouvelles données) ; bloquer le développement jusqu'à
  l'achat du domaine.

## R9. Longueur et normalisation du texte

- **Décision** : limite de 150 unités de texte au sens de l'attribut HTML `maxlength` (unités
  UTF-16), appliquée de la même façon dans le navigateur et sur le serveur. Avant le contrôle de
  longueur et le filtre : retours à la ligne et tabulations remplacés par des espaces, espaces
  multiples réduits, espaces de début et de fin retirés.
- **Justification** : une seule façon de compter des deux côtés évite qu'un texte accepté par le
  navigateur soit refusé par le serveur. Un emoji compte pour 2, ce qui reste marginal.
- Au collage d'un texte trop long, le navigateur garde les 150 premières unités et affiche
  « texte coupé » (cas limite de la spec).

## R10. Page de confidentialité

- **Décision** : une page Astro par langue, `/{locale}/confidentialite/` (même chemin dans les
  quatre langues, pour simplifier les liens), rendue côté serveur pour lire
  `PRIVACY_CONTACT_EMAIL`. Lien dans le pied de page de toutes les pages et à côté du champ libre.
  - Le lien du champ libre ouvre la page dans un nouvel onglet ; les réponses sont de toute façon
    copiées dans le `sessionStorage` à chaque frappe, donc rien n'est perdu (FR-019).
  - Contenu exigé par FR-018 et FR-018a, rédigé dans les quatre langues, sans cookie ni script
    tiers.
- **Justification** : une page statique par langue suit la structure de la 001 ; le même chemin
  évite des traductions d'URL.
