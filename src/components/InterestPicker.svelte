<script lang="ts">
  // Choix des centres d'intérêt dans le référentiel uniquement (FR-006, FR-007) : recherche,
  // navigation par catégorie, puces retirables, ajout bloqué au-delà de 10.
  import { tick } from "svelte";
  import { MAX_INTERESTS } from "@/lib/criteria";
  import { byCategory, interestById, searchInterests } from "@/lib/interests-search";
  import type { MessageKey, Translator } from "@/lib/translate";
  import type { Locale } from "@/lib/types";

  interface Props {
    t: Translator;
    locale: Locale;
    selected: string[];
    /** Préfixe des identifiants, pour deux sélecteurs sur la même page. */
    idPrefix?: string;
    onadd: (id: string) => void;
    onremove: (id: string) => void;
  }

  let { t, locale, selected, idPrefix = "interests", onadd, onremove }: Props = $props();

  let query = $state("");
  let categoriesEl: HTMLElement | null = $state(null);
  let searchInput: HTMLInputElement | null = $state(null);

  const results = $derived(searchInterests(query, locale, selected));
  const groups = $derived(byCategory(locale, selected));
  const full = $derived(selected.length >= MAX_INTERESTS);
  const label = (id: string) => interestById(id)?.labels[locale] ?? id;

  /** Le bouton activé disparaît de la liste : le focus revient au champ de recherche. */
  async function keepFocus() {
    await tick();
    if (!document.activeElement || document.activeElement === document.body) searchInput?.focus();
  }

  function add(id: string) {
    if (full) return;
    onadd(id);
    void keepFocus();
  }

  function remove(id: string) {
    onremove(id);
    void keepFocus();
  }

  function browse() {
    const first = categoriesEl?.querySelector("summary");
    first?.focus();
    first?.scrollIntoView({ block: "nearest" });
  }
</script>

<div class="picker">
  <div class="search">
    <label for="{idPrefix}-search">{t("interests.search.label")}</label>
    <input
      id="{idPrefix}-search"
      type="search"
      autocomplete="off"
      spellcheck="false"
      placeholder={t("interests.search.placeholder")}
      bind:value={query}
      bind:this={searchInput}
      aria-describedby={full ? `${idPrefix}-max` : undefined}
    />
  </div>

  {#if query.trim()}
    {#if results.length > 0}
      <ul class="results" aria-label={t("interests.searchResults")}>
        {#each results as interest (interest.id)}
          <li>
            <button type="button" class="add" disabled={full} aria-label={t("interests.add", { label: interest.labels[locale] })} onclick={() => add(interest.id)}>
              <span aria-hidden="true">+</span>
              {interest.labels[locale]}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="no-result" role="status">
        {t("interests.noResult")}
        <button type="button" class="link" onclick={browse}>{t("interests.browse")}</button>
      </p>
    {/if}
  {/if}

  {#if full}
    <p id="{idPrefix}-max" class="max" role="status">{t("interests.max")}</p>
  {/if}

  <div class="selected">
    <p class="count" aria-live="polite">{t("interests.count", { count: selected.length })}</p>
    {#if selected.length > 0}
      <ul class="chips" aria-label={t("interests.selected")}>
        {#each selected as id (id)}
          <li class="chip">
            <span>{label(id)}</span>
            <button type="button" aria-label={t("interests.remove", { label: label(id) })} onclick={() => remove(id)}>
              <span aria-hidden="true">×</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <section class="categories" bind:this={categoriesEl} aria-labelledby="{idPrefix}-categories-title">
    <h3 id="{idPrefix}-categories-title">{t("interests.categories")}</h3>
    {#each groups as group (group.category)}
      <details>
        <summary>{t(`category.${group.category}` as MessageKey)}</summary>
        <ul class="results">
          {#each group.interests as interest (interest.id)}
            <li>
              <button type="button" class="add" disabled={full} aria-label={t("interests.add", { label: interest.labels[locale] })} onclick={() => add(interest.id)}>
                <span aria-hidden="true">+</span>
                {interest.labels[locale]}
              </button>
            </li>
          {/each}
        </ul>
      </details>
    {/each}
  </section>
</div>

<style>
  .picker {
    display: grid;
    gap: 0.9rem;
  }
  .search {
    display: grid;
    gap: 0.35rem;
  }
  label {
    font-weight: 600;
  }
  input[type="search"] {
    font: inherit;
    padding: 0.65rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--fg);
    min-height: 44px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .results {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .add {
    font: inherit;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    padding: 0.45rem 0.75rem;
    min-height: 40px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--surface);
    color: var(--fg);
    cursor: pointer;
  }
  .add:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .no-result,
  .max {
    margin: 0;
  }
  .max {
    color: var(--muted);
    font-weight: 600;
  }
  .link {
    font: inherit;
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
  }
  .count {
    margin: 0 0 0.4rem;
    color: var(--muted);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem 0.25rem 0.2rem 0.75rem;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-fg);
  }
  .chip button {
    font: inherit;
    font-size: 1.15rem;
    line-height: 1;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .chip button:hover {
    background: color-mix(in srgb, var(--accent-fg) 20%, transparent);
  }
  .categories h3 {
    font-size: 1rem;
    margin: 0 0 0.4rem;
  }
  details {
    border-top: 1px solid var(--border);
    padding: 0.35rem 0;
  }
  summary {
    cursor: pointer;
    padding: 0.4rem 0;
    min-height: 32px;
    font-weight: 600;
  }
  details .results {
    padding: 0.4rem 0 0.6rem;
  }
</style>
