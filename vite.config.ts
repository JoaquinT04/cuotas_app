/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "icon.svg"],
      manifest: {
        name: "Cuotas",
        short_name: "Cuotas",
        description: "Cuotas de tarjetas y presupuesto mensual",
        lang: "es-AR",
        display: "standalone",
        start_url: ".",
        scope: ".",
        theme_color: "#4f46e5",
        background_color: "#f1f5f9",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"] },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
