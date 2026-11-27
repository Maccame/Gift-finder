# Contract: API HTTP navigateur ↔ serveur (changements)

**Feature**: [spec.md](../spec.md) | **Base**: [api 001](../../001-questionnaire-idees-cadeaux/contracts/api.md)

Les règles communes de la 001 restent valables (JSON, `Cache-Control: no-store`, aucun
`Set-Cookie`, codes d'erreur traduits dans l'interface). Ajout : **aucune réponse, y compris
d'erreur, ne contient le texte libre reçu, sauf `appliedAboutText` dans une réponse 200**
(FR-017).

## GET `/api/status`

Ajout d'un champ :

```json
{
  "generation": "available",
  "availableAgainAt": null,
  "freeText": true
}
```

| Champ | Type | Valeurs |
|---|---|---|
| `freeText` | booléen | `true` si `PRIVACY_CONTACT_EMAIL` est configurée, sinon `false` : le champ libre n'est pas affiché (research R8) |

## POST `/api/suggestions`

**Requête** : ajout d'un champ facultatif.

```json
{
  "locale": "fr",
  "occasionId": "birthday",
  "relationId": "friend",
  "budgetId": "50_100",
  "interestIds": ["musician", "gamer", "flowers", "cooking", "hiking"],
  "aboutText": "adore les randonnées en montagne et le café"
}
```

| Champ | Règle | Sinon |
|---|---|---|
| `aboutText` | facultatif ; chaîne ; après normalisation ([data-model](../data-model.md) §1), 150 unités au plus | 400 `invalid_criteria` |
| `aboutText` alors que `freeText` vaut `false` | refusé | 400 `invalid_criteria` |

**Traitement, dans cet ordre** (étapes de la 001 conservées, ajouts en gras)

1. Valider la requête ; **normaliser `aboutText` et vérifier sa longueur**.
   - 1 bis. Limitation de débit, inchangée.
   - **1 ter. Appliquer `filterSensitive` ; garder le texte nettoyé et les catégories. Si le
     texte nettoyé est vide, `aboutText` est retiré des critères.**
2. Réserver une recherche dans les compteurs de quota, inchangé.
3. Appeler le modèle avec les critères **nettoyés** ([llm-input.md](./llm-input.md)).
4. à 7. Inchangés : validation, ordre figé, liens, affiliation.

Le filtre (1 ter) passe avant la réservation du quota : une demande refusée en 400 ne consomme
rien, et le texte détecté n'atteint jamais l'étape 3.

**Réponse 200** : ajout de deux champs.

```json
{
  "ideas": [ "… (inchangé)" ],
  "affiliateDisclosure": false,
  "appliedAboutText": "fan de jazz",
  "removedCategories": ["health"]
}
```

| Champ | Type | Sens |
|---|---|---|
| `appliedAboutText` | chaîne ou `null` | Le texte réellement transmis au modèle ; `null` si aucun |
| `removedCategories` | tableau de `SensitiveCategory` | Catégories retirées par le serveur ; `[]` si rien |

Si `removedCategories` n'est pas vide alors que le navigateur n'avait rien retiré, l'interface
remplace le champ par `appliedAboutText` et affiche le message de retrait (research R7).

**Réponses d'erreur** : inchangées (codes seuls). Elles ne contiennent jamais `aboutText`, ni
`appliedAboutText`, ni `removedCategories`.
