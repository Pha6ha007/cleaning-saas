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
          // React core + essential React-dependent libs that call createContext() at import time.
          // These MUST be in the same chunk to avoid undefined-React race conditions in production.
          if (id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router-dom/") ||
              id.includes("node_modules/react-router/") ||
              id.includes("node_modules/scheduler/") ||
              id.includes("node_modules/react-i18next") ||
              id.includes("node_modules/i18next") ||
              id.includes("node_modules/sonner") ||
              id.includes("node_modules/react-hot-toast")) {
            return "vendor-react";
          }

          // UI component libraries (Radix + shadcn generated components)
          if (id.includes("node_modules/@radix-ui/") ||
              id.includes("node_modules/class-variance-authority") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/lucide-react")) {
            return "vendor-ui";
          }

          // Charts / data visualisation
          if (id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3-") ||
              id.includes("node_modules/victory")) {
            return "vendor-charts";
          }

          // Date utilities (date-fns is large)
          if (id.includes("node_modules/date-fns")) {
            return "vendor-date";
          }

          // Animation library
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-animation";
          }

          // Form validation
          if (id.includes("node_modules/zod") ||
              id.includes("node_modules/react-hook-form") ||
              id.includes("node_modules/@hookform/")) {
            return "vendor-forms";
          }

          // Spreadsheet processing (xlsx is very large)
          if (id.includes("node_modules/xlsx") ||
              id.includes("node_modules/exceljs")) {
            return "vendor-spreadsheet";
          }

          // Maps (Google Maps — separate from Leaflet)
          if (id.includes("node_modules/@react-google-maps") ||
              id.includes("node_modules/@googlemaps")) {
            return "vendor-googlemaps";
          }

          // Map / geolocation (leaflet is large)
          if (id.includes("node_modules/leaflet") ||
              id.includes("node_modules/react-leaflet")) {
            return "vendor-map";
          }

          // Tanstack / state management
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-tanstack";
          }

          // Sentry (error tracking — kept separate so it can be deferred)
          if (id.includes("node_modules/@sentry/")) {
            return "vendor-sentry";
          }

          // Drag & drop (only used in maintenance calendar)
          if (id.includes("node_modules/@dnd-kit/")) {
            return "vendor-dnd";
          }

          // Paddle billing SDK (only used on billing page)
          if (id.includes("node_modules/@paddle/")) {
            return "vendor-paddle";
          }

          // QR code generation (only used in maintenance assets)
          if (id.includes("node_modules/qrcode")) {
            return "vendor-qrcode";
          }

          // Remaining third-party deps that DON'T depend on React at top level.
          // React-dependent packages (sonner, cmdk, etc.) are left for Rollup
          // to place naturally alongside their React import.
          if (id.includes("node_modules/")) {
            // Skip React-dependent packages — they must stay with Rollup's
            // natural ordering to ensure React is evaluated first.
            const reactDependent = [
              "sonner", "cmdk", "react-day-picker", "react-dropzone",
              "react-hook-form", "react-resizable-panels", "vaul",
              "input-otp", "react-remove-scroll", "react-style-singleton",
              "@floating-ui/react", "embla-carousel-react"
            ];
            if (reactDependent.some(pkg => id.includes(`node_modules/${pkg}`))) {
              return; // Let Rollup decide — keeps them near vendor-react
            }
            return "vendor-misc";
          }

          // Maintenance context pages (only loaded on /maintenance/* routes)
          if (id.includes("/pages/maintenance/") ||
              id.includes("/contexts/maintenance/")) {
            return "chunk-maintenance";
          }

          // Marketing / landing pages (rarely loaded after first visit)
          if (id.includes("/pages/platform") ||
              id.includes("/pages/products") ||
              id.includes("/marketing/")) {
            return "chunk-marketing";
          }

          // CleanProof app pages
          if (id.includes("/pages/") || id.includes("/components/")) {
            return "chunk-cleaning-app";
          }
        },
      },
    },
    // Raise warning threshold slightly — still targeting <500KB per chunk
    chunkSizeWarningLimit: 500,
  },
}));
