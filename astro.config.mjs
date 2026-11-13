// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import svelte from "@astrojs/svelte";

// Aucune intégration d'analytics ni police externe (principe VIII).
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    // Pas de liaison IMAGES : le site n'a pas d'images à transformer.
    imageService: "passthrough",
  }),
  // Les sessions Astro posent un cookie et stockent des données en KV : interdit (principe VIII).
  session: false,
  integrations: [svelte()],
  // Barre d'outils de développement désactivée : elle insère du contenu dans la page testée.
  devToolbar: { enabled: false },
  i18n: {
    locales: ["fr", "en", "es", "de"],
    defaultLocale: "fr",
    routing: {
      prefixDefaultLocale: true,
      // La racine / est gérée par src/pages/index.astro (Accept-Language, sans cookie).
      redirectToDefaultLocale: false,
    },
  },
});
