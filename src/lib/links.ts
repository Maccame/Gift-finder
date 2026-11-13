// Liens d'achat, construits APRÈS que l'ordre a été figé (contracts/api.md, étapes 6 et 7 ;
// FR-020 à FR-023). Ces fonctions ne réordonnent ni ne filtrent jamais les idées (principe VI).
import type { RankedIdea } from "./generation/validate";
import type { GiftIdea, Locale, PurchaseLink } from "./types";

export const AMAZON_HOSTS: Record<Locale, string> = {
  fr: "www.amazon.fr",
  de: "www.amazon.de",
  es: "www.amazon.es",
  en: "www.amazon.co.uk",
};

/** Seuls les liens Amazon des idées de rang 1 et 2 peuvent être affiliés (FR-022). */
export const MAX_AFFILIATE_RANK = 2;

export interface AmazonTags {
  AMAZON_TAG_FR?: string;
  AMAZON_TAG_DE?: string;
  AMAZON_TAG_ES?: string;
  AMAZON_TAG_UK?: string;
}

const TAG_KEYS: Record<Locale, keyof AmazonTags> = {
  fr: "AMAZON_TAG_FR",
  de: "AMAZON_TAG_DE",
  es: "AMAZON_TAG_ES",
  en: "AMAZON_TAG_UK",
};

/** Identifiant affilié du pays de la langue, ou `undefined` s'il n'est pas configuré. */
export function amazonTagFor(env: AmazonTags, locale: Locale): string | undefined {
  const tag = env[TAG_KEYS[locale]]?.trim();
  return tag ? tag : undefined;
}

export type LinkedIdea = RankedIdea & { links: PurchaseLink[] };

/** Nouvelle liste, dans le même ordre, avec les liens Amazon puis Etsy de chaque idée. */
export function buildLinks(rankedIdeas: readonly RankedIdea[], locale: Locale, tag: string | undefined): LinkedIdea[] {
  const affiliateTag = tag?.trim() || undefined;
  return rankedIdeas.map((idea) => {
    const amazonParams = new URLSearchParams({ k: idea.searchQuery });
    const affiliate = affiliateTag !== undefined && idea.rank <= MAX_AFFILIATE_RANK;
    if (affiliate) amazonParams.set("tag", affiliateTag);
    const etsyParams = new URLSearchParams({ q: idea.searchQuery });
    return {
      ...idea,
      matchedInterestIds: [...idea.matchedInterestIds],
      links: [
        { merchant: "amazon", url: `https://${AMAZON_HOSTS[locale]}/s?${amazonParams}`, affiliate },
        { merchant: "etsy", url: `https://www.etsy.com/search?${etsyParams}`, affiliate: false },
      ],
    };
  });
}

/** Corps 200 de /api/suggestions : liens ajoutés, `searchQuery` retiré, mention calculée. */
export function toSelectionBody(
  rankedIdeas: readonly RankedIdea[],
  locale: Locale,
  tag: string | undefined,
): { ideas: GiftIdea[]; affiliateDisclosure: boolean } {
  const ideas: GiftIdea[] = buildLinks(rankedIdeas, locale, tag).map(({ searchQuery: _searchQuery, ...idea }) => idea);
  const affiliateDisclosure = ideas.some((idea) => idea.links.some((link) => link.affiliate));
  return { ideas, affiliateDisclosure };
}
