import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["awrisan-icon.png"],
      manifest: {
        name: "Awrisan",
        short_name: "Awrisan",
        description: "Arisan Testnet yang menjaga budaya dan menghilangkan risiko bandar.",
        start_url: "/",
        display: "standalone",
        background_color: "#F8F6F1",
        theme_color: "#004E3D",
        lang: "id-ID",
        icons: [
          {
            src: "/awrisan-icon.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/stellar/"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.js"],
  },
});
