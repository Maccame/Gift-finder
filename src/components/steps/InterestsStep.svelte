<script lang="ts">
  import InterestPicker from "../InterestPicker.svelte";
  import type { Translator } from "@/lib/translate";
  import type { Locale } from "@/lib/types";

  interface Props {
    t: Translator;
    locale: Locale;
    selected: string[];
    headingRef?: HTMLElement | null;
    onadd: (id: string) => void;
    onremove: (id: string) => void;
  }

  let { t, locale, selected, headingRef = $bindable(null), onadd, onremove }: Props = $props();
</script>

<section class="interests-step" aria-labelledby="interests-title">
  <h2 id="interests-title" tabindex="-1" bind:this={headingRef}>{t("step.interests.title")}</h2>
  <p class="hint">{t("step.interests.hint")}</p>
  <InterestPicker {t} {locale} {selected} {onadd} {onremove} />
</section>

<style>
  h2 {
    margin: 0;
    font-size: 1.35rem;
  }
  .hint {
    margin: 0.25rem 0 1rem;
    color: var(--muted);
  }
</style>
