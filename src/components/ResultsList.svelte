<script lang="ts">
  // Idées par rang, avec prix indicatif et centres d'intérêt (FR-012). Seules les idées reçues
  // sont affichées, sans case vide.
  import { interestById } from "@/lib/interests-search";
  import type { Translator } from "@/lib/translate";
  import type { GiftIdea, Locale } from "@/lib/types";

  interface Props {
    t: Translator;
    locale: Locale;
    ideas: GiftIdea[];
  }

  let { t, locale, ideas }: Props = $props();

  const sorted = $derived([...ideas].sort((a, b) => a.rank - b.rank));
  const price = $derived((value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value),
  );
  const interestsOf = (idea: GiftIdea) =>
    idea.matchedInterestIds.map((id) => interestById(id)?.labels[locale] ?? id).join(", ");
</script>

<ol class="results-list" aria-label={t("results.listLabel")}>
  {#each sorted as idea (idea.rank)}
    <li class="idea">
      <h3>{idea.title}</h3>
      <p class="description">{idea.description}</p>
      <p class="price">{t("results.price", { price: price(idea.priceEur) })}</p>
      <p class="matches">{t("results.matches", { interests: interestsOf(idea) })}</p>
    </li>
  {/each}
</ol>

<style>
  .results-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.8rem;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
  }
  .idea {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    background: var(--surface);
    display: grid;
    gap: 0.4rem;
    align-content: start;
  }
  h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  p {
    margin: 0;
  }
  .price {
    font-weight: 700;
  }
  .matches {
    color: var(--muted);
    font-size: 0.95rem;
  }
</style>
