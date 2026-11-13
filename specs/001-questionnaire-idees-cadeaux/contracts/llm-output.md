# Contract: échange serveur ↔ API Claude

**Feature**: [spec.md](../spec.md) | **Décisions**: [research.md](../research.md) R3, R4, R12

Seul `src/lib/generation/claude.ts` appelle l'API ; les tests le remplacent par des réponses
enregistrées (`tests/fixtures/llm/`).

## Paramètres de l'appel

| Paramètre | Valeur |
|---|---|
| Modèle | `claude-sonnet-5-5` |
| Sortie structurée | `output_config.format` avec le schéma ci-dessous (Zod) |
| Effort | `output_config.effort: "low"` |
| Repli en cas de refus | `fallbacks: "default"`, bêta `server-side-fallback-2026-07-01`, sous réserve de son éligibilité à la ZDR (research R12, tâche T075) |
| `max_tokens` | 4 000 |
| Délai maximal | 20 s (abandon de la requête) |
| Nouvelles tentatives | 0 (`maxRetries: 0`) |
| Clé | Secret `ANTHROPIC_API_KEY`, jamais dans le dépôt |

## Données envoyées (FR-030)

**Consigne système** : fixe et versionnée dans `src/lib/generation/prompt.ts`. Elle demande :

- 6 idées de cadeaux distinctes et concrètes pour une personne décrite par les critères ;
- un prix indicatif en euros dans la tranche donnée ;
- des textes dans la langue indiquée ;
- pour chaque idée, une courte requête de recherche marchande (`searchQuery`) dans cette
  langue ;
- aucune marque imposée, aucune URL, aucun contenu inapproprié pour l'occasion.

Elle ne mentionne ni l'affiliation ni les marchands (principe VI).

**Message utilisateur** : uniquement les critères, avec les libellés dans la langue active.

```json
{
  "language": "fr",
  "occasion": "Anniversaire",
  "relation": "Ami",
  "budget": { "minEur": 50, "maxEur": 100 },
  "interests": [
    { "id": "musician", "label": "Musicien" },
    { "id": "gamer", "label": "Gamer" },
    { "id": "flowers", "label": "Aime les fleurs" },
    { "id": "cooking", "label": "Cuisine" },
    { "id": "hiking", "label": "Randonnée" }
  ]
}
```

Jamais envoyés : IP, en-têtes du visiteur, identifiant de session, texte libre.

## Schéma de sortie attendu

```json
{
  "ideas": [
    {
      "title": "chaîne, 80 caractères au plus",
      "description": "chaîne, 300 caractères au plus, 2 phrases au plus",
      "priceEur": 69,
      "matchedInterestIds": ["musician"],
      "searchQuery": "pédale delay guitare"
    }
  ]
}
```

| Champ | Contrainte vérifiée côté serveur après réception |
|---|---|
| `ideas` | De 1 à 6 éléments (les éléments au-delà de 6 sont ignorés) |
| `title` | Non vide, 80 caractères au plus |
| `description` | Non vide, 300 caractères au plus |
| `priceEur` | Nombre dans la tranche de budget, sinon l'idée est écartée |
| `matchedInterestIds` | Au moins 1, tous présents dans les critères envoyés, sinon l'idée est écartée |
| `searchQuery` | Non vide, 80 caractères au plus, sans URL |

## Cas de réponse

| Situation | Effet côté API du site |
|---|---|
| `stop_reason` normal, au moins 1 idée valide | 200 (voir [api.md](./api.md)) |
| `stop_reason: "refusal"` après le repli | 422 `no_valid_idea` |
| Aucune idée valide après filtrage | 422 `no_valid_idea` |
| `stop_reason: "max_tokens"` ou JSON inexploitable | 502 `generation_failed` |
| Erreur du fournisseur (5xx, 429, réseau) | 502 `generation_failed` |
| Plus de 20 s | 504 `generation_timeout` |

## Jeux de réponses enregistrées pour les tests

- `nominal-fr.json`, `nominal-en.json`, `nominal-es.json`, `nominal-de.json` : 6 idées valides.
- `out-of-budget.json` : 2 idées hors tranche, 4 valides.
- `duplicates.json` : 2 titres identiques.
- `unknown-interest.json` : un `matchedInterestIds` absent des critères.
- `refusal.json` : `stop_reason: "refusal"`.
- `truncated.json` : `stop_reason: "max_tokens"`.
- `long-description.json` : une description de 3 phrases, réduite à 2 par la validation.
