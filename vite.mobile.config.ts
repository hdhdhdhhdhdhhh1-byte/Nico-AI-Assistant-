import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  appType: "spa",

  plugins: [
    react(),
    tsconfigPaths(),
  ],

  resolve: {
    conditions: ["browser"],
  },

  build: {
    outDir: ".output/public",
    emptyOutDir: true,
    ssr: false,
  },

  server: {
    host: "0.0.0.0",
  },
});
