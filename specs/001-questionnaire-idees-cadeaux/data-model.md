# Data Model: Questionnaire guidé d'idées cadeaux

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-11

Les noms techniques sont en anglais (code), les libellés en français. Les types sont décrits sans
code d'implémentation.

## 1. Locale (langue)

| Champ | Type | Règles |
|---|---|---|
| `locale` | `"fr" \| "en" \| "es" \| "de"` | `"fr"` par défaut (FR-026) |

Correspondance avec le marché Amazon (FR-020) : `fr → amazon.fr`, `de → amazon.de`,
`es → amazon.es`, `en → amazon.co.uk`.

## 2. Données de référence (fichiers versionnés dans `src/data/`)

### Occasion

| Champ | Type | Règles |
|---|---|---|
| `id` | chaîne | Stable, ex. `christmas`, `birthday`, `valentines`, `mothers_day`, `fathers_day`, `wedding`, `birth`, `housewarming`, `thank_you`, `other` (FR-003) |
| `labels` | `Record<Locale, string>` | Les 4 langues obligatoires |

### Relation

| Champ | Type | Règles |
|---|---|---|
| `id` | chaîne | `partner`, `parent`, `child`, `sibling`, `grandparent`, `friend`, `colleague`, `other` (FR-004) |
| `labels` | `Record<Locale, string>` | Les 4 langues obligatoires |

### BudgetBracket (tranche de budget)

| Champ | Type | Règles |
|---|---|---|
| `id` | chaîne | `under_20`, `20_50`, `50_100`, `100_200`, `over_200` (FR-005) |
| `minEur` | entier | 0, 20, 50, 100, 200 |
| `maxEur` | entier ou `null` | 20, 50, 100, 200, `null` (sans limite haute) |
| `labels` | `Record<Locale, string>` | Les 4 langues obligatoires |

Une idée est dans la tranche si `minEur ≤ prix ≤ maxEur` (borne haute ignorée si `null`).

### Interest (centre d'intérêt)

| Champ | Type | Règles |
|---|---|---|
| `id` | chaîne | Stable, unique, ex. `musician` |
| `category` | chaîne | Une des catégories du référentiel (musique, sport, jeux, nature, cuisine…) |
| `labels` | `Record<Locale, string>` | Les 4 langues obligatoires (FR-006, SC-008) |

Environ 150 entrées. Recherche : comparaison des libellés de la langue active après
normalisation (minuscules, accents retirés, espaces réduits) ; une entrée correspond si l'un de
ses mots commence par le texte tapé.

## 3. Criteria (critères saisis)

| Champ | Type | Règles |
|---|---|---|
| `occasionId` | `Occasion.id` | Obligatoire |
| `relationId` | `Relation.id` | Obligatoire |
| `budgetId` | `BudgetBracket.id` | Obligatoire |
| `interestIds` | liste de `Interest.id` | De 5 à 10, sans doublon, toutes présentes dans le référentiel (FR-007) |
| `locale` | `Locale` | Langue active au moment de la validation (FR-027) |

**Statut des critères** (`getCriteriaStatus`) :

| Statut | Condition | Effet sur le bouton |
|---|---|---|
| `incomplete` | Une étape vide ou moins de 5 centres d'intérêt | Désactivé, avec le nombre de centres d'intérêt manquants (FR-010) |
| `unchanged` | Critères identiques à ceux de la sélection affichée | Désactivé (FR-018) |
| `ready` | Critères complets et différents de la sélection affichée | Actif |

**Égalité de deux critères** : mêmes `occasionId`, `relationId`, `budgetId`, `locale`, et même
ensemble de `interestIds` (l'ordre de choix ne compte pas).

## 4. GiftIdea (idée cadeau)

| Champ | Type | Règles |
|---|---|---|
| `rank` | entier 1–6 | Position dans l'ordre figé (R8, étape 3) |
| `title` | chaîne | 1 à 80 caractères |
| `description` | chaîne | 1 à 300 caractères, 2 phrases au plus (FR-012) |
| `priceEur` | nombre | Prix indicatif, dans la tranche choisie, sinon l'idée est écartée (FR-012, SC-006) |
| `matchedInterestIds` | liste de `Interest.id` | Au moins 1, toutes présentes dans `Criteria.interestIds` |
| `links` | liste de `PurchaseLink` | Exactement 2 : Amazon puis Etsy (FR-020) |

Les idées en double (même titre après normalisation) sont écartées ; seule la première est
gardée. Une description de plus de 2 phrases est réduite à ses 2 premières phrases.

Pendant US1, `links` est vide ; la règle « exactement 2 » s'applique à partir de US3.

## 5. PurchaseLink (lien d'achat)

| Champ | Type | Règles |
|---|---|---|
| `merchant` | `"amazon" \| "etsy"` | |
| `url` | URL https | Recherche du `searchQuery` de l'idée chez le marchand |
| `affiliate` | booléen | `true` seulement pour les liens Amazon des 2 premières idées, et seulement si un identifiant est configuré pour le pays (FR-022) |

Les liens sont construits **après** que l'ordre a été figé (FR-021).

## 6. Selection (sélection)

| Champ | Type | Règles |
|---|---|---|
| `criteria` | `Criteria` | Les critères qui l'ont produite |
| `ideas` | liste de `GiftIdea` | De 1 à 6, triées par `rank` |
| `affiliateDisclosure` | booléen | `true` si au moins un lien est affilié (mention légale affichée, FR-023) |

Une seule sélection existe à la fois, en mémoire dans le navigateur ; elle est remplacée à
chaque validation réussie (FR-019).

## 7. QuotaCounter (compteur de quota, côté serveur)

Table D1 `quota_counter` :

| Colonne | Type | Règles |
|---|---|---|
| `period_key` | texte, clé primaire | `day:AAAA-MM-JJ` ou `month:AAAA-MM`, fuseau Europe/Paris |
| `count` | entier ≥ 0 | Nombre de recherches réservées sur la période |

Limites (configuration, pas dans la table) : `QUOTA_DAILY = 30`, `QUOTA_MONTHLY = 700` (R4).

**Réservation** : une recherche est acceptée seulement si les deux compteurs sont sous leur
limite. Les deux incréments se font de façon atomique ; si l'un échoue, rien n'est compté et la
réponse est 429. Une recherche réservée reste comptée même si la génération échoue (R5).

Cette table ne contient **aucune** donnée liée à un visiteur.

## 8. États de l'interface (îlot `GiftFinder`)

```text
step1 → step2 → step3 → step4 ──(clic, statut ready)──▶ loading
  ▲ retour ◀──────────────────┘                          │
                                                         ├─ 200 ─▶ results
                                                         ├─ 429 quota_reached ─▶ quota_reached
                                                         └─ 422/429 rate_limited/502/504/réseau ─▶ error

results ──(modification d'un critère)──▶ results_dirty
results_dirty ──(clic valider, statut ready)──▶ loading
results_dirty ──(retour aux mêmes critères)──▶ results
error ──(Réessayer)──▶ loading
quota_reached : la saisie reste possible, le bouton est remplacé par le message (FR-024)
```

- En `loading`, les boutons de génération sont désactivés (FR-014).
- En `error` et `quota_reached`, la sélection précédente reste affichée si elle existe (FR-025).
- Un changement de langue en `results` mène à `results_dirty`, car `locale` fait partie des
  critères (FR-028).

## 9. Où vivent les données

| Donnée | Où | Durée de vie |
|---|---|---|
| Critères, sélection, étape courante | Mémoire de l'îlot, copie dans `sessionStorage` | Jusqu'à la fermeture de l'onglet (FR-029) |
| Langue | URL (`/fr/`, `/en/`…) | Aucune conservation |
| Compteurs de quota | D1 `quota_counter` | Une ligne par jour et par mois, sans donnée de visiteur |
| Critères envoyés à l'IA | Requête vers l'API Anthropic | Le temps de l'appel côté site ; conservation par le fournisseur à vérifier (research R12) |
| Données de référence, textes | Fichiers versionnés | Permanente (aucune donnée de visiteur) |

Interdits : cookies, `localStorage`, IndexedDB, journaux de requêtes, outils d'analytics
(principe VIII).
