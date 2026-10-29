import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { BOOT_SCRIPT, cssVars, THEMES } from "./src/theme";

/** Writes the theme tokens into index.html as CSS variables, plus a tiny
 *  script that picks the theme before first paint (no flash). */
function themeTokens(): Plugin {
  return {
    name: "forma-theme-tokens",
    transformIndexHtml(html) {
      const css =
        `:root, :root[data-theme="dark"] { ${cssVars(THEMES.dark.ui)} }\n` +
        `:root[data-theme="light"] { ${cssVars(THEMES.light.ui)} }`;
      return html.replace("</head>", `  <style id="theme-tokens">${css}</style>\n    <script>${BOOT_SCRIPT}</script>\n  </head>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), themeTokens()],
  // The 3D chunk (three + R3F + drei) is lazy-loaded and large by nature.
  build: { chunkSizeWarningLimit: 1400 },
});
