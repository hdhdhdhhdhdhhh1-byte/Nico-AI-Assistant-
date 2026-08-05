import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    prerender: {
      enabled: false,
      failOnError: false,
    },
    spa: {
      enabled: false,
    },
  },
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: [],
      failOnError: false,
    },
  },
});
