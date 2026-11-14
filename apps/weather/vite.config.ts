import { themeInitPlugin } from "@portfolio/ui/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/projects/weatherappv2/",
  plugins: [react(), tailwindcss(), themeInitPlugin()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
  preview: { port: 5174, strictPort: true },
  test: {
    name: "weather",
    environment: "jsdom",
  },
});
