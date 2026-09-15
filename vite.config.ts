import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// The game ships as ONE self-contained HTML file so it can be published as a
// Claude Artifact (see CLAUDE.md > Publishing). Nothing is loaded at runtime
// except the Google Fonts stylesheet, which the Artifact CSP allows.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
  },
});
