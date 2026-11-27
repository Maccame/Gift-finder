# Data Model: Réponses en champ libre dans le questionnaire

**Feature**: [spec.md](./spec.md) | **Base**: [data-model 001](../001-questionnaire-idees-cadeaux/data-model.md)

Seuls les ajouts et changements par rapport à la 001 sont décrits ici.

## 1. AboutText (réponse libre)

Le texte facultatif du champ « À propos de la personne » (FR-001).

| Règle | Valeur | Exigence |
|---|---|---|
| Type | chaîne, facultative | FR-002 |
| Normalisation | retours à la ligne et tabulations → espace ; espaces multiples réduits ; espaces de début et de fin retirés | Cas limites, research R9 |
| Longueur après normalisation | 0 à 150 unités (`maxlength`) ; au-delà → 400 côté serveur | FR-003 |
| Vide | chaîne vide après normalisation : traitée comme absente, jamais transmise | FR-006 |
| Filtre | passe par `filterSensitive` avant tout envoi (§4) | FR-011, FR-012 |

## 2. Criteria et Draft (étendus)

```text
Criteria {
  occasionId, relationId, budgetId, interestIds, locale   // inchangés (001 §3)
  aboutText?: string                                       // §1, absent si vide
}
```

- `Draft.aboutText` : chaîne, `""` par défaut.
- **Égalité des critères** (`criteriaEqual`) : compare aussi `aboutText` après normalisation ;
  une modification du texte rend les critères différents de ceux de la sélection affichée
  (FR-008). Un texte qui ne diffère que par des espaces n'est pas une modification.
- **Validation** : `aboutText` ne compte pas dans le minimum de 5 centres d'intérêt et n'est
  jamais exigé (FR-002). Le serveur refuse `aboutText` (400) quand le champ est désactivé
  (`PRIVACY_CONTACT_EMAIL` vide, research R8).

## 3. SensitiveCategory et SensitiveTerms (données de référence)

```text
SensitiveCategory = "health" | "ethnic_origin" | "political_opinion" | "religious_belief"
                  | "trade_union" | "genetic_biometric" | "sex_life_orientation" | "contact"
```

Fichier versionné `src/data/sensitive-terms.json` :

```text
{
  version: number,                       // incrémentée à chaque changement de liste
  categories: {
    [category]: { terms: Record<Locale, string[]>, patterns?: string[] }
  },
  exclusions: Record<Locale, string[]>   // occasions, relations, fêtes et rites, grossesse (FR-014)
}
```

- `terms` : mots ou expressions, écrits en minuscules, avec leurs variantes de genre et de nombre.
- `patterns` : uniquement pour `contact` (e-mail, téléphone).
- Les libellés affichés des catégories sont dans les fichiers de traduction
  (`sensitive.category.<id>`), pas dans ce fichier.

## 4. FilterResult (résultat du filtre)

```text
filterSensitive(text: string) → {
  text: string,                        // texte nettoyé (segments détectés retirés), peut être ""
  categories: SensitiveCategory[]      // sans doublon, dans l'ordre de FR-011 ; [] si rien
}
```

- Jamais de champ qui contienne le passage retiré (research R3).
- Fonction pure, sans état, identique dans le navigateur et le Worker.

## 5. Corpus de test du filtre

`tests/fixtures/sensitive-corpus/{fr,en,es,de}.json` :

```text
{
  detect: [{ text: string, categories: SensitiveCategory[], expected: string }],  // ≥ 5 par catégorie
  neutral: [{ text: string }]                                                     // phrases à laisser passer
}
```

- `expected` : texte attendu après retrait (ex. `"fan de jazz"`).
- Au moins 5 phrases `detect` par catégorie et par langue, soit 160 au moins (FR-013).
- Au moins 50 phrases `neutral` au total, dont dans chaque langue des mentions de grossesse et
  de fêtes ou rites religieux (FR-014).
- Phrases inventées uniquement, aucune donnée réelle (research R6).

## 6. États de l'interface (ajouts à l'îlot `GiftFinder`)

État propre au champ libre, indépendant des états de la 001 :

```text
clean ──(frappe + 400 ms ou sortie du champ, catégories ≠ [])──▶ warned
warned ──(texte reformulé, catégories = [])──▶ clean
warned ──(clic résultats/valider)──▶ redacted   // champ remplacé par le texte nettoyé
redacted ──(modification du champ)──▶ clean ou warned
```

- `warned` : message « un passage relevant de {catégories} sera retiré à l'envoi » ; le texte
  n'est pas modifié (FR-012 point 2).
- `redacted` : message « un passage relevant de {catégories} a été retiré » ; il reste affiché
  jusqu'à la prochaine modification du champ (FR-012 point 3).
- Le compteur affiche les unités restantes ; il est annoncé aux technologies d'assistance à
  partir de 20 restantes (FR-004).
- Champ absent quand le service ne fournit pas de contact (research R8) : `GET /api/status`
  renvoie `freeText: false`.

## 7. Où vivent les données (ajouts à la 001 §9)

| Donnée | Où | Durée de vie |
|---|---|---|
| `aboutText` saisi | Mémoire de l'îlot, copie dans `sessionStorage` | Jusqu'à la fermeture de l'onglet (FR-016) |
| `aboutText` nettoyé envoyé | Corps de `POST /api/suggestions`, puis requête vers l'API Anthropic | Le temps de l'appel côté site, jamais écrit ni journalisé (FR-016, FR-017) ; 30 jours au plus chez Anthropic, hors exceptions documentées (plan, Constitution Check) |
| Adresse de contact | Variable `PRIVACY_CONTACT_EMAIL` du Worker | Configuration, aucune donnée de visiteur |
| Listes du filtre, corpus | Fichiers versionnés | Permanente, aucune donnée de visiteur |
