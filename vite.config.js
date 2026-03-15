import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For GitHub Pages: set base to "/<repo-name>/"
// Change this to match your actual repository name
export default defineConfig({
  plugins: [react()],
  base: "/fair-value-calculator/",
});
