import { themeInitPlugin } from "@portfolio/ui/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), themeInitPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3000",
      // One origin in dev, like production: the demo apps are proxied in.
      "/projects/weatherappv2": { target: "http://localhost:5174", ws: true },
      "/projects/seatpicker": { target: "http://localhost:5175", ws: true },
    },
  },
  preview: { port: 5173, strictPort: true },
  test: {
    name: "portfolio",
    environment: "jsdom",
  },
});
