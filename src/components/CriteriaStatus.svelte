<script lang="ts">
  // Ce qui manque pour activer le bouton (FR-010), annoncé aux lecteurs d'écran.
  import type { CriteriaStatus } from "@/lib/criteria";
  import type { Translator } from "@/lib/translate";

  interface Props {
    t: Translator;
    status: CriteriaStatus;
    id?: string;
    tooMany?: boolean;
  }

  let { t, status, id = "criteria-status", tooMany = false }: Props = $props();

  const message = $derived.by(() => {
    if (status.status !== "incomplete") return "";
    if (status.missingStep < 4) return t("criteria.missingStep", { n: status.missingStep });
    if (status.missingInterests > 0) return t("criteria.missingInterests", { count: status.missingInterests });
    return tooMany ? t("criteria.tooMany") : "";
  });
</script>

<p {id} class="criteria-status" aria-live="polite">{message}</p>

<style>
  .criteria-status {
    margin: 0;
    min-height: 1.5em;
    color: var(--muted);
    font-weight: 600;
  }
</style>
