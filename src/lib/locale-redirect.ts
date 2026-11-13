// Langue de la racine / d'après Accept-Language, sans cookie ni mémorisation (principe VIII, R6).
import { DEFAULT_LOCALE, isLocale } from "./locales";
import type { Locale } from "./types";

/** Langue prise en charge de plus fort poids `q`, sinon `fr`. */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const candidates = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((c) => c.q > 0 && isLocale(c.lang))
    // Tri par poids décroissant ; à poids égal, l'ordre d'écriture.
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return (candidates[0]?.lang as Locale | undefined) ?? DEFAULT_LOCALE;
}

export function redirectToLocale(request: Request): Response {
  const locale = pickLocale(request.headers.get("Accept-Language"));
  return new Response(null, {
    status: 302,
    headers: { Location: `/${locale}/`, Vary: "Accept-Language", "Cache-Control": "no-store" },
  });
}
