<script lang="ts">
  import RadioStep from "./RadioStep.svelte";
  import budgets from "@/data/budgets.json";
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
  name={compact ? "budget-compact" : "budget"}
  title={t("step.budget.title")}
  options={budgets}
  {locale}
  {value}
  {compact}
  error={showError && !value ? t("error.missing.budget") : null}
  bind:headingRef
  {onchange}
/>
