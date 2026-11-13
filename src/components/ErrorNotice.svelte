<script lang="ts">
  // Échec de génération (FR-025) : message compréhensible et « Réessayer », sauf quand il faut
  // changer les critères (no_valid_idea).
  import type { Translator } from "@/lib/translate";
  import type { ApiError } from "@/lib/types";

  interface Props {
    t: Translator;
    error: ApiError;
    onretry: () => void;
  }

  let { t, error, onretry }: Props = $props();

  const message = $derived.by(() => {
    switch (error) {
      case "generation_timeout":
        return t("error.generation_timeout");
      case "no_valid_idea":
        return t("error.no_valid_idea");
      case "rate_limited":
        return t("error.rate_limited");
      default:
        return t("error.generation_failed");
    }
  });
  const canRetry = $derived(error !== "no_valid_idea");
</script>

<div class="error-notice" role="alert">
  <p class="message">{message}</p>
  {#if canRetry}
    <p class="kept">{t("error.kept")}</p>
    <button type="button" class="retry" onclick={onretry}>{t("action.retry")}</button>
  {/if}
</div>

<style>
  .error-notice {
    border: 1px solid var(--danger);
    border-radius: var(--radius);
    padding: 0.8rem 1rem;
    display: grid;
    gap: 0.4rem;
    justify-items: start;
  }
  p {
    margin: 0;
  }
  .message {
    color: var(--danger);
    font-weight: 700;
  }
  .kept {
    color: var(--muted);
  }
  .retry {
    font: inherit;
    font-weight: 600;
    padding: 0.55rem 1rem;
    min-height: 44px;
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--accent);
    cursor: pointer;
  }
</style>
