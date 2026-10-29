import * as THREE from "three";
import { THEMES } from "../theme";

const D = THEMES.dark.scene;

/** Scene palette. Themed colours start from the dark theme and follow the
 *  theme springs every frame (see Room's useThemeMaterials); the plant, the
 *  person and the fabrics are the same in both themes. */
export const PALETTE = {
  platformTop: D.platformTop,
  platformSide: D.platformSide,
  charcoal: D.charcoal,
  charcoalDark: D.charcoalDark,
  charcoalLight: D.charcoalLight,
  metal: D.metal,
  wood: D.wood,
  sign: D.sign,
  rug: D.rug,
  plant: "#2FBF55",
  plantDark: "#23974A",
  skin: "#C99A78",
  hair: "#1B1716",
  sweater: "#3E70EA",
  trousers: "#24262E",
  shoes: "#151518",
} as const;

const std = (color: string, roughness = 0.75, metalness = 0, flatShading = false) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading });

/** Shared materials (one instance each → fewer shader programs and state
 *  changes). Pieces that need a per-instance colour (tabletop, fabric) make
 *  their own. */
export const MAT = {
  platformTop: std(PALETTE.platformTop, 0.9),
  platformSide: std(PALETTE.platformSide, 0.95),
  charcoal: std(PALETTE.charcoal, 0.7),
  charcoalDark: std(PALETTE.charcoalDark, 0.6),
  charcoalLight: std(PALETTE.charcoalLight, 0.8),
  metal: std(PALETTE.metal, 0.38, 0.65),
  wood: std(PALETTE.wood, 0.7),
  plant: std(PALETTE.plant, 0.6, 0, true),
  plantDark: std(PALETTE.plantDark, 0.6, 0, true),
  skin: std(PALETTE.skin, 0.7, 0, true),
  hair: std(PALETTE.hair, 0.8, 0, true),
  sweater: std(PALETTE.sweater, 0.85, 0, true),
  trousers: std(PALETTE.trousers, 0.85, 0, true),
  shoes: std(PALETTE.shoes, 0.6, 0, true),
  // Unlit, so the card reads as its true colour (black / white) in any light.
  sign: new THREE.MeshBasicMaterial({ color: PALETTE.sign }),
};
