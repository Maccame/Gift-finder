# Contract: API HTTP navigateur ↔ serveur

**Feature**: [spec.md](../spec.md) | **Modèle de données**: [data-model.md](../data-model.md)

Deux points d'accès, servis par le même Worker que les pages.

## Règles communes

- Format JSON, encodage UTF-8.
- Réponses avec `Cache-Control: no-store` et **sans** en-tête `Set-Cookie` (principe VIII).
- Aucune journalisation des requêtes (observabilité du Worker désactivée).
- Les messages d'erreur destinés au visiteur sont traduits dans l'interface à partir du champ
  `error` ; l'API ne renvoie que des codes.

## GET `/api/status`

État du service de génération, appelé au chargement de la page pour afficher le message de
quota avant tout clic (FR-024).

**Réponse 200**

```json
{
  "generation": "available",
  "availableAgainAt": null
}
```

| Champ | Type | Valeurs |
|---|---|---|
| `generation` | chaîne | `"available"` ou `"limited"` |
| `availableAgainAt` | date ISO 8601 ou `null` | Minuit (Europe/Paris) du lendemain si le quota journalier est atteint, le 1er du mois suivant si le quota mensuel l'est |

Cet appel ne consomme pas de quota.

## POST `/api/suggestions`

Génère une sélection d'idées cadeaux.

**Requête**

```json
{
  "locale": "fr",
  "occasionId": "birthday",
  "relationId": "friend",
  "budgetId": "50_100",
  "interestIds": ["musician", "gamer", "flowers", "cooking", "hiking"]
}
```

Règles de validation (sinon 400) : voir [data-model.md](../data-model.md) §3. Tout champ
inconnu est refusé.

**Traitement, dans cet ordre**

1. Valider la requête.
   - 1 bis. Vérifier la limitation de débit (research R11) ; si refus → 429 `rate_limited`,
     sans consommer de quota.
2. Réserver une recherche dans les compteurs de quota (data-model §7) ; si refus → 429.
3. Appeler le modèle avec les critères (voir [llm-output.md](./llm-output.md)), avec abandon à
   20 s.
4. Valider la réponse : schéma, prix dans la tranche, `matchedInterestIds` inclus dans les
   critères, doublons écartés, 6 idées au plus.
5. **Figer l'ordre** : celui de la réponse validée, numéroté `rank` 1 à 6.
6. Construire les liens Amazon (pays de `locale`) et Etsy à partir de `searchQuery`.
7. Ajouter l'identifiant affilié aux liens Amazon des idées `rank` 1 et 2, s'il est configuré
   pour le pays.

Les étapes 6 et 7 ne peuvent pas modifier l'ordre fixé à l'étape 5 (FR-021, SC-010).

**Réponse 200**

```json
{
  "ideas": [
    {
      "rank": 1,
      "title": "Pédale d'effet pour guitare",
      "description": "Une pédale de delay compacte pour enrichir son son. Idéale pour un musicien qui joue chez lui.",
      "priceEur": 69,
      "matchedInterestIds": ["musician"],
      "links": [
        { "merchant": "amazon", "url": "https://www.amazon.fr/s?k=p%C3%A9dale+delay+guitare&tag=…", "affiliate": true },
        { "merchant": "etsy", "url": "https://www.etsy.com/search?q=p%C3%A9dale+delay+guitare", "affiliate": false }
      ]
    }
  ],
  "affiliateDisclosure": true
}
```

| Statut | Corps | Cas |
|---|---|---|
| 200 | `{ ideas, affiliateDisclosure }` | De 1 à 6 idées valides |
| 400 | `{ "error": "invalid_criteria" }` | Requête invalide |
| 422 | `{ "error": "no_valid_idea" }` | Le modèle a refusé ou aucune idée n'a passé la validation |
| 429 | `{ "error": "quota_reached", "availableAgainAt": "…" }` | Quota journalier ou mensuel atteint |
| 429 | `{ "error": "rate_limited" }` | Trop de requêtes en peu de temps ; aucun quota consommé |
| 502 | `{ "error": "generation_failed" }` | Erreur du fournisseur ou réponse inexploitable |
| 504 | `{ "error": "generation_timeout" }` | Plus de 20 s |

Comportement attendu de l'interface pour chaque statut : [data-model.md](../data-model.md) §8.

## Tests de contrat

- Une requête avec 4 centres d'intérêt, un identifiant inconnu ou un doublon renvoie 400 sans
  consommer de quota.
- Avec le quota atteint, la réponse est 429 et le modèle simulé n'est pas appelé.
- Avec la limitation de débit refusée, la réponse est 429 `rate_limited`, sans réservation de
  quota ni appel au modèle.
- Pour une même réponse simulée du modèle, l'ordre des `ideas` est identique avec et sans
  identifiant d'affiliation (SC-010).
- Une sélection contient au plus 2 liens `affiliate: true` (SC-011).
- Aucune réponse ne contient d'en-tête `Set-Cookie`.
