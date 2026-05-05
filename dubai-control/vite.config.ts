import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-icon.svg"],
      manifest: {
        name: "MaintainProof",
        short_name: "MaintainProof",
        description: "Asset maintenance tracking and proof-of-work verification",
        theme_color: "#2d5a5a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/maintenance/visits",
        icons: [
          {
            src: "pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB (default is 2 MB)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Disable in dev to avoid conflicts
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // ── App-level code splitting (safe — no React dependency issues) ──

          // Maintenance pages: keep route-level chunks instead of one mega-bundle.
          if (id.includes("/pages/maintenance/")) {
            const match = id.match(/\/pages\/maintenance\/([^/]+)/);
            const pageName = match?.[1]?.replace(/\.[^.]+$/, "") || "page";
            return `maintenance-${pageName.toLowerCase()}`;
          }

          // Maintenance context/providers can be shared across maintenance routes.
          if (id.includes("/contexts/maintenance/")) {
            return "maintenance-shared";
          }

          // Marketing / landing pages (rarely loaded after first visit)
          if (id.includes("/pages/platform") ||
              id.includes("/pages/products") ||
              id.includes("/marketing/")) {
            return "chunk-marketing";
          }

          // ── Vendor splitting: only for large, React-free packages ──
          
          // Spreadsheet processing (xlsx/exceljs + cpexcel helpers)
          if (id.includes("node_modules/xlsx") ||
              id.includes("node_modules/exceljs") ||
              id.includes("node_modules/codepage") ||
              id.includes("node_modules/cfb") ||
              id.includes("node_modules/ssf") ||
              id.includes("node_modules/wmf") ||
              id.includes("node_modules/word") ||
              id.includes("node_modules/crc-32") ||
              id.includes("node_modules/adler-32") ||
              id.includes("node_modules/cp") ||
              id.includes("/xlsx.mjs") ||
              id.includes("/cpexcel.")) {
            return "vendor-spreadsheet";
          }

          // Date utilities (date-fns — React-free)
          if (id.includes("node_modules/date-fns")) {
            return "vendor-date";
          }

          // DO NOT add a catch-all for node_modules here.
          // Many packages call React.useState/createContext at module scope.
          // Forcing them into a separate chunk causes evaluation order bugs
          // where React is undefined → white screen in production.
        },
      },
    },
    // Raise warning threshold slightly — still targeting <500KB per chunk
    chunkSizeWarningLimit: 500,
  },
}));
