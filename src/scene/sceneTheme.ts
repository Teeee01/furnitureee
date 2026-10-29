import { SpringValue } from "@react-spring/three";
import * as THREE from "three";
import { THEMES, type SceneTokens, type ThemeName } from "../theme";
import { TWEEN } from "./anim/config";

/*
 * The 3D side of the theme: one spring per scene token (colours as r/g/b),
 * so a theme switch tweens every material, light and shadow over 400 ms —
 * independently of any furniture animation that may be running.
 */

type ColourKey = { [K in keyof SceneTokens]: SceneTokens[K] extends string ? K : never }[keyof SceneTokens];
type NumberKey = { [K in keyof SceneTokens]: SceneTokens[K] extends number ? K : never }[keyof SceneTokens];

type SV = SpringValue<number>;
const tmp = new THREE.Color();

export class SceneTheme {
  name: ThemeName;
  private colours = new Map<ColourKey, [SV, SV, SV]>();
  private numbers = new Map<NumberKey, SV>();

  constructor(name: ThemeName) {
    this.name = name;
    const t = THEMES[name].scene;
    for (const [k, v] of Object.entries(t) as [keyof SceneTokens, string | number][]) {
      if (typeof v === "number") this.numbers.set(k as NumberKey, new SpringValue(v));
      else {
        // Interpolate in linear space (what the renderer works in).
        tmp.set(v);
        this.colours.set(k as ColourKey, [new SpringValue(tmp.r), new SpringValue(tmp.g), new SpringValue(tmp.b)]);
      }
    }
  }

  /** Tween to a theme (or jump, before first paint). */
  set(name: ThemeName, animate = true) {
    this.name = name;
    const t = THEMES[name].scene;
    const config = TWEEN.colour;
    for (const [k, v] of Object.entries(t) as [keyof SceneTokens, string | number][]) {
      if (typeof v === "number") {
        const s = this.numbers.get(k as NumberKey)!;
        if (animate) s.start({ to: v, config });
        else s.set(v);
      } else {
        tmp.set(v);
        this.colours.get(k as ColourKey)!.forEach((s, i) => {
          const to = [tmp.r, tmp.g, tmp.b][i]!;
          if (animate) s.start({ to, config });
          else s.set(to);
        });
      }
    }
  }

  /** Current value of a colour token into `out`. */
  colour(key: ColourKey, out: THREE.Color) {
    const [r, g, b] = this.colours.get(key)!;
    return out.setRGB(r.get(), g.get(), b.get());
  }

  number(key: NumberKey) {
    return this.numbers.get(key)!.get();
  }
}

/** The "Matte White" finish is tuned per theme (brighter on the light
 *  platform); other finishes keep their colour. */
export function themedTabletop(hex: string, theme: ThemeName) {
  return hex.toUpperCase() === THEMES.dark.scene.matteWhite.toUpperCase() ? THEMES[theme].scene.matteWhite : hex;
}
