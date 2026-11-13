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
  i18n: {
    locales: ["fr", "en", "es", "de"],
    defaultLocale: "fr",
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
});
