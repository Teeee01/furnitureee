import * as THREE from "three";

/** Scene palette. Everything is charcoal except the tabletop / fabric, the
 *  plant and the person's top. */
export const PALETTE = {
  platformTop: "#222228",
  platformSide: "#18181C",
  charcoal: "#2F2F36",
  charcoalDark: "#222228",
  charcoalLight: "#34343B",
  metal: "#3A3A42",
  wood: "#2F2A27",
  plant: "#2FBF55",
  plantDark: "#23974A",
  skin: "#C99A78",
  hair: "#1B1716",
  sweater: "#3E70EA",
  trousers: "#24262E",
  shoes: "#151518",
  sign: "#0B0B0D",
  rug: "#B4B4BA",
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
  sign: std(PALETTE.sign, 0.5),
};
