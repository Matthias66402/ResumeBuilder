import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    // In development the FastAPI backend runs separately on port 8000.
    proxy: { "/api": "http://localhost:8000" },
  },
});
