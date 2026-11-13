<script lang="ts">
  import RadioStep from "./RadioStep.svelte";
  import relations from "@/data/relations.json";
  import type { Translator } from "@/lib/translate";
  import type { Locale } from "@/lib/types";

  interface Props {
    t: Translator;
    locale: Locale;
    value: string | null;
    showError?: boolean;
    compact?: boolean;
    headingRef?: HTMLElement | null;
    onchange: (id: string) => void;
  }

  let { t, locale, value, showError = false, compact = false, headingRef = $bindable(null), onchange }: Props = $props();
</script>

<RadioStep
  name={compact ? "relation-compact" : "relation"}
  title={t("step.relation.title")}
  options={relations}
  {locale}
  {value}
  {compact}
  error={showError && !value ? t("error.missing.relation") : null}
  bind:headingRef
  {onchange}
/>
