import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone single-page kiosk app.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
