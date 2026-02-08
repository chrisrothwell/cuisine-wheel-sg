import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-data": [
            "wouter",
            "@tanstack/react-query",
            "@trpc/client",
            "@trpc/react-query",
            "superjson",
          ],
          "vendor-maps": ["react-simple-maps", "d3-geo"],
          "vendor-motion": ["framer-motion"],
          "vendor-gmaps": ["@react-google-maps/api"],
        },
      },
    },
  },
  server: {
    host: true,
  },
});
