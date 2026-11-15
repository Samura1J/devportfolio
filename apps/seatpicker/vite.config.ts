import { themeInitPlugin } from "@portfolio/ui/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/projects/seatpicker/",
  plugins: [react(), tailwindcss(), themeInitPlugin()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
  preview: { port: 5175, strictPort: true },
  test: {
    name: "seatpicker",
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
