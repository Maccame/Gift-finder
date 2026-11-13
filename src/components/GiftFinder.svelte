<script lang="ts">
  // Îlot interactif : questionnaire, génération et résultats (data-model §8).
  import { onMount, tick } from "svelte";
  import OccasionStep from "./steps/OccasionStep.svelte";
  import RelationStep from "./steps/RelationStep.svelte";
  import BudgetStep from "./steps/BudgetStep.svelte";
  import InterestsStep from "./steps/InterestsStep.svelte";
  import CriteriaStatus from "./CriteriaStatus.svelte";
  import QuotaNotice from "./QuotaNotice.svelte";
  import ErrorNotice from "./ErrorNotice.svelte";
  import ResultsList from "./ResultsList.svelte";
  import CriteriaPanel from "./CriteriaPanel.svelte";
  import StaleNotice from "./StaleNotice.svelte";
  import { fetchStatus, requestSuggestions } from "@/lib/api-client";
  import { criteriaEqual, emptyDraft, getCriteriaStatus, MAX_INTERESTS, toCriteria, type Draft } from "@/lib/criteria";
  import { loadState, saveState, type Step } from "@/lib/session-state";
  import { createTranslator, type Messages } from "@/lib/translate";
  import type { ApiError, Criteria, Locale, Selection } from "@/lib/types";

  interface Props {
    locale: Locale;
    messages: Messages;
  }

  let { locale, messages }: Props = $props();
  const t = $derived(createTranslator(messages, locale));

  let step = $state<Step>(1);
  // svelte-ignore state_referenced_locally
  let draft = $state<Draft>(emptyDraft(locale));
  let selection = $state<Selection | null>(null);
  let loading = $state(false);
  let error = $state<ApiError | null>(null);
  let quotaLimited = $state(false);
  let quotaAgainAt = $state<string | null>(null);
  /** Critères refusés par un 422 : un nouvel essai identique ne consommerait que du quota. */
  let lastRejected = $state<Criteria | null>(null);
  let showStepError = $state(false);
  let restored = $state(false);

  let lastRequested: Criteria | null = null;
  let inFlight = false;

  let stepHeading: HTMLElement | null = $state(null);
  let resultsHeading: HTMLElement | null = $state(null);

  const status = $derived(getCriteriaStatus(draft, [selection?.criteria, lastRejected]));
  const canSubmit = $derived(status.status === "ready" && !loading);
  /** État `results_dirty` : les critères affichés diffèrent de ceux de la sélection (FR-017). */
  const dirty = $derived.by(() => {
    if (!selection) return false;
    const current = toCriteria(draft);
    return !current || !criteriaEqual(current, selection.criteria);
  });

  onMount(() => {
    const saved = loadState();
    if (saved) {
      step = saved.step;
      // Changement de langue (FR-028) : les critères sont gardés, la langue suit l'URL. Si une
      // sélection est affichée, elle passe en `results_dirty` sans aucune requête.
      draft = { ...saved.draft, locale };
      selection = saved.selection;
    }
    restored = true;
    void fetchStatus().then((s) => {
      if (s?.generation === "limited") {
        quotaLimited = true;
        quotaAgainAt = s.availableAgainAt;
      }
    });
  });

  $effect(() => {
    if (!restored) return;
    saveState({ step, draft: $state.snapshot(draft), selection: $state.snapshot(selection) });
  });

  async function focusStep() {
    await tick();
    stepHeading?.focus();
  }

  function stepValue(s: Step): string | null {
    if (s === 1) return draft.occasionId;
    if (s === 2) return draft.relationId;
    if (s === 3) return draft.budgetId;
    return null;
  }

  function next() {
    if (step < 4 && !stepValue(step)) {
      showStepError = true;
      return;
    }
    showStepError = false;
    step = Math.min(4, step + 1) as Step;
    void focusStep();
  }

  function back() {
    showStepError = false;
    step = Math.max(1, step - 1) as Step;
    void focusStep();
  }

  function update(patch: Partial<Draft>) {
    draft = { ...draft, ...patch };
    showStepError = false;
  }

  function addInterest(id: string) {
    if (draft.interestIds.includes(id) || draft.interestIds.length >= MAX_INTERESTS) return;
    update({ interestIds: [...draft.interestIds, id] });
  }

  function removeInterest(id: string) {
    update({ interestIds: draft.interestIds.filter((x) => x !== id) });
  }

  async function run(criteria: Criteria) {
    // Une seule requête en vol (FR-014) : le verrou est posé avant tout `await`.
    if (inFlight) return;
    inFlight = true;
    loading = true;
    error = null;
    lastRequested = criteria;
    const result = await requestSuggestions(criteria);
    loading = false;
    inFlight = false;

    if (result.ok) {
      selection = result.selection;
      lastRejected = null;
      await tick();
      resultsHeading?.focus();
      return;
    }
    if (result.error === "quota_reached") {
      quotaLimited = true;
      quotaAgainAt = result.availableAgainAt ?? null;
      return;
    }
    if (result.error === "no_valid_idea") lastRejected = criteria;
    error = result.error;
  }

  function submit() {
    if (!canSubmit) return;
    const criteria = toCriteria(draft);
    if (criteria) void run(criteria);
  }

  function retry() {
    if (lastRequested) void run(lastRequested);
  }
</script>

<div class="gift-finder">
  {#if selection}
    <div class="results-layout">
      <section class="results" aria-labelledby="results-title">
        <h2 id="results-title" tabindex="-1" bind:this={resultsHeading}>{t("results.title")}</h2>
        <StaleNotice {t} visible={dirty} />
        {#if loading}
          <p class="loading" role="status">{t("loading")}</p>
        {/if}
        {#if error}
          <ErrorNotice {t} {error} onretry={retry} />
        {/if}
        <ResultsList {t} {locale} ideas={selection.ideas} />
      </section>

      <section class="criteria" aria-labelledby="criteria-title">
        <h2 id="criteria-title">{t("criteria.title")}</h2>
        <CriteriaPanel {t} {locale} {draft} onchange={update} onadd={addInterest} onremove={removeInterest} />
        <div class="actions">
          {#if quotaLimited}
            <QuotaNotice {t} {locale} availableAgainAt={quotaAgainAt} />
          {:else}
            <button type="button" class="primary" disabled={!canSubmit} aria-describedby="criteria-status" onclick={submit}>
              {t("action.update")}
            </button>
          {/if}
        </div>
        {#if !quotaLimited}
          <CriteriaStatus {t} {status} tooMany={draft.interestIds.length > MAX_INTERESTS} />
        {/if}
      </section>
    </div>
  {:else}
    <p class="progress">{t("step.progress", { n: step })}</p>
    <progress class="progress-bar" max="4" value={step} aria-label={t("progress.label")}></progress>

    <div class="step">
      {#if step === 1}
        <OccasionStep {t} {locale} value={draft.occasionId} showError={showStepError} bind:headingRef={stepHeading} onchange={(id) => update({ occasionId: id })} />
      {:else if step === 2}
        <RelationStep {t} {locale} value={draft.relationId} showError={showStepError} bind:headingRef={stepHeading} onchange={(id) => update({ relationId: id })} />
      {:else if step === 3}
        <BudgetStep {t} {locale} value={draft.budgetId} showError={showStepError} bind:headingRef={stepHeading} onchange={(id) => update({ budgetId: id })} />
      {:else}
        <InterestsStep {t} {locale} selected={draft.interestIds} bind:headingRef={stepHeading} onadd={addInterest} onremove={removeInterest} />
      {/if}
    </div>

    <div class="actions">
      {#if step > 1}
        <button type="button" class="secondary" onclick={back}>{t("action.back")}</button>
      {/if}
      {#if step < 4}
        <button type="button" class="primary" onclick={next}>{t("action.next")}</button>
      {:else if !quotaLimited}
        <button type="button" class="primary" disabled={!canSubmit} aria-describedby="criteria-status" onclick={submit}>
          {t("action.seeIdeas")}
        </button>
      {/if}
    </div>

    {#if step === 4}
      {#if quotaLimited}
        <QuotaNotice {t} {locale} availableAgainAt={quotaAgainAt} />
      {:else}
        <CriteriaStatus {t} {status} tooMany={draft.interestIds.length > MAX_INTERESTS} />
      {/if}
      {#if loading}
        <p class="loading" role="status">{t("loading")}</p>
      {/if}
      {#if error}
        <ErrorNotice {t} {error} onretry={retry} />
      {/if}
    {/if}
  {/if}
</div>

<style>
  .gift-finder {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }
  .progress {
    margin: 0;
    color: var(--muted);
    font-weight: 600;
  }
  .progress-bar {
    width: 100%;
    height: 0.5rem;
    accent-color: var(--accent);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  button {
    font: inherit;
    font-weight: 600;
    padding: 0.7rem 1.2rem;
    min-height: 44px;
    border-radius: var(--radius);
    cursor: pointer;
  }
  .primary {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--accent-fg);
  }
  .primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .secondary {
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
  }
  .loading {
    margin: 0;
    font-weight: 600;
  }
  .results h2 {
    margin: 0 0 0.75rem;
    font-size: 1.35rem;
  }
  .results,
  .criteria {
    display: grid;
    gap: 0.75rem;
    align-content: start;
  }
  .criteria h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .results-layout {
    display: grid;
    gap: 2rem;
  }
  .criteria {
    border-top: 1px solid var(--border);
    padding-top: 1.5rem;
  }
</style>
