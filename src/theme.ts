/*
 * THE THEME — every colour of the UI and the 3D scene, for both themes.
 *
 * The UI reads these as CSS variables (generated into index.html at build
 * time by the plugin in vite.config.ts, so the first paint already has the
 * right colours). The 3D scene reads the same object: materials, lights and
 * shadow strengths tween between the two columns with springs.
 */

export type ThemeName = "dark" | "light";

export interface UiTokens {
  /** Page background. */
  bg: string;
  /** Inputs (read-only model field). */
  input: string;
  /** Button / pill fill. */
  btn: string;
  line: string;
  lineHover: string;
  fg: string;
  muted: string;
  accent: string;
  accentHover: string;
  /** Text on the accent. */
  onAccent: string;
  success: string;
  /** Inactive step dots. */
  dot: string;
  /** Active segmented button: border, fill, inner glow (dark only). */
  activeBorder: string;
  activeFill: string;
  activeGlow: string;
}

export interface SceneTokens {
  platformTop: string;
  platformSide: string;
  /** The soft shadow under the floating platform. */
  floorShadow: string;
  floorShadowOpacity: number;
  /** Chairs, table bases, pots, lamps. */
  charcoal: string;
  charcoalDark: string;
  charcoalLight: string;
  metal: string;
  wood: string;
  rug: string;
  /** "Matte White" tabletop (and the living-room tables). */
  matteWhite: string;
  /** Tabletop edge = top colour × this (lower = stronger edge shadow). */
  tableEdge: number;
  sign: string;
  signText: string;
  signBorder: string;
  ambient: number;
  hemisphere: number;
  key: number;
  rim: number;
  /** Directional shadow strength (0–1). */
  shadow: number;
  contactShadow: number;
}

export interface Theme {
  ui: UiTokens;
  scene: SceneTokens;
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    ui: {
      bg: "#0E0E10",
      input: "#16161A",
      btn: "#18181B",
      line: "#26262B",
      lineHover: "#3A3A41",
      fg: "#F2F2F3",
      muted: "#8A8A93",
      accent: "#4F63F6",
      accentHover: "#6173F7",
      onAccent: "#FFFFFF",
      success: "#3DD68C",
      dot: "#3A3A40",
      activeBorder: "rgb(79 99 246 / 0.6)",
      activeFill: "#18181B",
      activeGlow: "inset 0 0 12px rgb(79 99 246 / 0.16)",
    },
    scene: {
      platformTop: "#222228",
      platformSide: "#18181C",
      floorShadow: "#000000",
      floorShadowOpacity: 0.75,
      charcoal: "#2F2F36",
      charcoalDark: "#222228",
      charcoalLight: "#34343B",
      metal: "#3A3A42",
      wood: "#2F2A27",
      rug: "#B4B4BA",
      matteWhite: "#E8E8EC",
      tableEdge: 0.9,
      sign: "#0B0B0D",
      signText: "#F2F2F3",
      signBorder: "#0B0B0D",
      ambient: 0.32,
      hemisphere: 0.35,
      key: 3,
      rim: 0.35,
      shadow: 1,
      contactShadow: 0.6,
    },
  },
  light: {
    ui: {
      bg: "#F4F3F0",
      input: "#FFFFFF",
      btn: "#FFFFFF",
      line: "#E2E0DB",
      lineHover: "#C9C6BF",
      fg: "#16161A",
      muted: "#6E6E76",
      accent: "#4F63F6",
      accentHover: "#3F53E6",
      onAccent: "#FFFFFF",
      success: "#1FA971",
      dot: "#D2CFC9",
      activeBorder: "rgb(79 99 246 / 0.5)",
      // White with a 6% indigo tint (a solid colour, so it can tween).
      activeFill: "#F4F6FF",
      activeGlow: "inset 0 0 0 0 rgb(79 99 246 / 0)",
    },
    scene: {
      platformTop: "#E9E7E2",
      platformSide: "#D9D6D0",
      floorShadow: "#5C4A38",
      floorShadowOpacity: 0.24,
      charcoal: "#8C8A86",
      charcoalDark: "#7E7C78",
      charcoalLight: "#9A9894",
      metal: "#8A8884",
      wood: "#8E8579",
      rug: "#B9B7B2",
      matteWhite: "#FAFAF8",
      tableEdge: 0.78,
      sign: "#FFFFFF",
      signText: "#16161A",
      signBorder: "#D9D6D0",
      ambient: 0.85,
      hemisphere: 0.7,
      key: 2.4,
      rim: 0.25,
      shadow: 0.5,
      contactShadow: 0.35,
    },
  },
};

export const THEME_STORAGE_KEY = "forma-theme";
/** UI and scene colours tween for this long on a theme switch. */
export const THEME_TWEEN_MS = 400;

/** CSS variables for one theme (kebab-cased token names). */
export function cssVars(t: UiTokens) {
  return Object.entries(t)
    .map(([k, v]) => `--${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${v};`)
    .join(" ");
}

/** Runs before first paint (inlined into index.html): picks the stored
 *  theme, else the system setting. */
export const BOOT_SCRIPT = `(function(){var t;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t})();`;
