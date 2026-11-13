// Types du modèle de données (specs/001-questionnaire-idees-cadeaux/data-model.md).

export type Locale = "fr" | "en" | "es" | "de";

export type Labels = Record<Locale, string>;

/** Occasion du cadeau (data-model §2, FR-003). */
export interface Occasion {
  id: string;
  labels: Labels;
}

/** Relation avec la personne (data-model §2, FR-004). */
export interface Relation {
  id: string;
  labels: Labels;
}

/** Tranche de budget en euros (data-model §2, FR-005). */
export interface BudgetBracket {
  id: string;
  /** Entier. */
  minEur: number;
  /** Entier, ou `null` : sans limite haute. */
  maxEur: number | null;
  labels: Labels;
}

/** Centre d'intérêt du référentiel (data-model §2, FR-006). */
export interface Interest {
  id: string;
  category: string;
  labels: Labels;
}

/** Critères saisis (data-model §3). */
export interface Criteria {
  occasionId: string;
  relationId: string;
  budgetId: string;
  /** De 5 à 10, sans doublon, toutes présentes dans le référentiel. */
  interestIds: string[];
  locale: Locale;
}

/** Lien d'achat (data-model §5). */
export interface PurchaseLink {
  merchant: "amazon" | "etsy";
  url: string;
  affiliate: boolean;
}

/** Idée cadeau (data-model §4). */
export interface GiftIdea {
  /** Entier 1–6. */
  rank: number;
  /** 1 à 80 caractères. */
  title: string;
  /** 1 à 300 caractères, 2 phrases au plus. */
  description: string;
  priceEur: number;
  /** Au moins 1, toutes présentes dans `Criteria.interestIds`. */
  matchedInterestIds: string[];
  links: PurchaseLink[];
}

/** Sélection affichée (data-model §6). */
export interface Selection {
  criteria: Criteria;
  /** De 1 à 6, triées par `rank`. */
  ideas: GiftIdea[];
  affiliateDisclosure: boolean;
}

/** Codes d'erreur de l'API (contracts/api.md). */
export type ApiError =
  | "invalid_criteria"
  | "no_valid_idea"
  | "quota_reached"
  | "rate_limited"
  | "generation_failed"
  | "generation_timeout";
