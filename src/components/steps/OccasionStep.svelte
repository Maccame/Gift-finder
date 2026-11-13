<script lang="ts">
  import RadioStep from "./RadioStep.svelte";
  import occasions from "@/data/occasions.json";
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
  name={compact ? "occasion-compact" : "occasion"}
  title={t("step.occasion.title")}
  options={occasions}
  {locale}
  {value}
  {compact}
  error={showError && !value ? t("error.missing.occasion") : null}
  bind:headingRef
  {onchange}
/>
