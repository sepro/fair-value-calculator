import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoBasePath = "/fair-value-calculator/";
// For GitHub Pages: set base to "/<repo-name>/"
// Change this to match your actual repository name
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? repoBasePath : "/",
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
  },
}));
