<script lang="ts">
  // Groupe de boutons radio d'une étape (FR-003 à FR-005, FR-008) : sélection au clavier native
  // (flèches), message d'erreur relié par aria-describedby.
  import type { Labels, Locale } from "@/lib/types";

  interface Props {
    name: string;
    title: string;
    options: { id: string; labels: Labels }[];
    locale: Locale;
    value: string | null;
    error?: string | null;
    compact?: boolean;
    /** Titre focalisable à chaque changement d'étape. */
    headingRef?: HTMLElement | null;
    onchange: (id: string) => void;
  }

  let { name, title, options, locale, value, error = null, compact = false, headingRef = $bindable(null), onchange }: Props = $props();
  const errorId = $derived(`${name}-error`);
</script>

<fieldset class="radio-step" class:compact aria-describedby={error ? errorId : undefined}>
  <legend>
    {#if compact}
      <span class="legend-text">{title}</span>
    {:else}
      <h2 tabindex="-1" bind:this={headingRef}>{title}</h2>
    {/if}
  </legend>
  <div class="options">
    {#each options as option (option.id)}
      <label class="option">
        <input type="radio" {name} value={option.id} checked={value === option.id} onchange={() => onchange(option.id)} />
        <span>{option.labels[locale]}</span>
      </label>
    {/each}
  </div>
  {#if error}
    <p id={errorId} class="error" role="alert">{error}</p>
  {/if}
</fieldset>

<style>
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 0.75rem;
  }
  h2 {
    margin: 0;
    font-size: 1.35rem;
  }
  .legend-text {
    font-weight: 600;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.5rem;
  }
  .compact .options {
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.35rem;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    cursor: pointer;
    min-height: 44px;
  }
  .compact .option {
    padding: 0.4rem 0.6rem;
    min-height: 40px;
    font-size: 0.95rem;
  }
  .option:has(input:checked) {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .option:has(input:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  input {
    accent-color: var(--accent);
    width: 1.1rem;
    height: 1.1rem;
    margin: 0;
  }
  input:focus-visible {
    outline: none;
  }
  .error {
    color: var(--danger);
    margin: 0.6rem 0 0;
    font-weight: 600;
  }
</style>
