<script lang="ts">
  // Message « service limité » à la place du bouton (FR-024) ; la saisie reste possible.
  import type { Translator } from "@/lib/translate";
  import type { Locale } from "@/lib/types";

  interface Props {
    t: Translator;
    locale: Locale;
    availableAgainAt: string | null;
  }

  let { t, locale, availableAgainAt }: Props = $props();

  const date = $derived.by(() => {
    if (!availableAgainAt) return "";
    const d = new Date(availableAgainAt);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(d);
  });
</script>

<div class="quota-notice" role="status">
  <p class="title">{t("quota.limited", { date })}</p>
  <p class="hint">{t("quota.hint")}</p>
</div>

<style>
  .quota-notice {
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent);
    border-radius: var(--radius);
    background: var(--surface);
    padding: 0.8rem 1rem;
  }
  p {
    margin: 0;
  }
  .title {
    font-weight: 700;
  }
  .hint {
    margin-top: 0.3rem;
    color: var(--muted);
  }
</style>
