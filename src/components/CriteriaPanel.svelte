<script lang="ts">
  // Tous les critères, modifiables depuis la page des résultats sans changer d'écran (FR-015).
  import OccasionStep from "./steps/OccasionStep.svelte";
  import RelationStep from "./steps/RelationStep.svelte";
  import BudgetStep from "./steps/BudgetStep.svelte";
  import InterestPicker from "./InterestPicker.svelte";
  import type { Draft } from "@/lib/criteria";
  import type { Translator } from "@/lib/translate";
  import type { Locale } from "@/lib/types";

  interface Props {
    t: Translator;
    locale: Locale;
    draft: Draft;
    onchange: (patch: Partial<Draft>) => void;
    onadd: (id: string) => void;
    onremove: (id: string) => void;
  }

  let { t, locale, draft, onchange, onadd, onremove }: Props = $props();
</script>

<div class="criteria-panel">
  <OccasionStep {t} {locale} compact value={draft.occasionId} onchange={(id) => onchange({ occasionId: id })} />
  <RelationStep {t} {locale} compact value={draft.relationId} onchange={(id) => onchange({ relationId: id })} />
  <BudgetStep {t} {locale} compact value={draft.budgetId} onchange={(id) => onchange({ budgetId: id })} />
  <fieldset class="interests">
    <legend>{t("step.interests.title")}</legend>
    <InterestPicker {t} {locale} selected={draft.interestIds} idPrefix="panel-interests" {onadd} {onremove} />
  </fieldset>
</div>

<style>
  .criteria-panel {
    display: grid;
    gap: 1.25rem;
  }
  .interests {
    border: 0;
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  .interests legend {
    font-weight: 600;
    padding: 0;
    margin-bottom: 0.75rem;
  }
</style>
