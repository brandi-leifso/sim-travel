import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone SPA. Dev server falls back to index.html for /display and /admin
// (Vite default appType: "spa"); the production Node relay does the same.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
