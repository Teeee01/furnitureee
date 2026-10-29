import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The 3D chunk (three + R3F + drei) is lazy-loaded and large by nature.
  build: { chunkSizeWarningLimit: 1400 },
});
