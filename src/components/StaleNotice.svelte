<script lang="ts">
  // Signal « la liste ne correspond plus aux critères affichés » (FR-017). La zone live existe
  // toujours, pour que l'apparition du message soit annoncée.
  import type { Translator } from "@/lib/translate";

  interface Props {
    t: Translator;
    visible: boolean;
  }

  let { t, visible }: Props = $props();
</script>

<div class="stale" aria-live="polite">
  {#if visible}
    <p>{t("stale.message")}</p>
  {/if}
</div>

<style>
  p {
    margin: 0;
    padding: 0.7rem 1rem;
    border-radius: var(--radius);
    border: 1px dashed var(--accent);
    background: var(--surface);
    font-weight: 600;
  }
</style>
