import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { RugItem } from "../anim/director";
import type { SceneTheme } from "../sceneTheme";
import { setOpacity, useLiveSlab } from "../geometry";
import { PALETTE } from "../materials";

/** A soft, low, light-grey textured rug (procedural noise texture). */
let rugTexture: THREE.CanvasTexture | null = null;
export function getRugTexture() {
  if (rugTexture) return rugTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    // Fine tufted noise with a faint woven row pattern.
    const v = 205 + (Math.random() - 0.5) * 46 + Math.sin(y * 0.9) * 5 + Math.sin(x * 0.35 + y * 0.12) * 3;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v + 3;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  rugTexture = new THREE.CanvasTexture(canvas);
  rugTexture.wrapS = rugTexture.wrapT = THREE.RepeatWrapping;
  rugTexture.colorSpace = THREE.SRGBColorSpace;
  rugTexture.anisotropy = 4;
  return rugTexture;
}

const rollGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
rollGeo.rotateX(Math.PI / 2);

/** The rug UNROLLS along its length (and rolls back up): the flat part grows
 *  from its left end while a roll travels along the leading edge. Size and
 *  position glide with the morph spring. */
export function Rug({ item, theme }: { item: RugItem; theme: SceneTheme }) {
  const flat = useRef<THREE.Mesh>(null);
  const roll = useRef<THREE.Mesh>(null);
  const slab = useLiveSlab(0.002);
  const material = useMemo(() => {
    const map = getRugTexture().clone();
    map.needsUpdate = true;
    // Extruded caps use world-unit UVs: one texture tile per 0.8 m.
    map.repeat.set(1.25, 1.25);
    return new THREE.MeshStandardMaterial({ color: PALETTE.rug, map, roughness: 1 });
  }, []);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  useFrame(() => {
    const f = flat.current;
    const r = roll.current;
    if (!f || !r) return;
    const a = item.anim;
    const L = a.length.get();
    const W = a.width.get();
    const u = Math.max(0, Math.min(1, a.unroll.get()));
    if (slab.update({ length: L, width: W, radius: 0.12, thickness: 0.014, bevel: 0.006 })) f.geometry = slab.geometry!;
    const left = a.x.get() - L / 2;
    f.position.set(left + (L * u) / 2, 0.001, a.z.get());
    f.scale.x = Math.max(u, 1e-4);
    f.visible = u > 0.002;
    // The roll: thickest when rolled up, gone when flat.
    // It grows in as unrolling starts (and shrinks away as it finishes
    // rolling up), so a rug waiting to unroll is invisible.
    const appear = Math.min(1, u / 0.06);
    const radius = (0.012 + 0.05 * Math.sqrt(1 - u)) * appear;
    r.visible = u > 0.002 && u < 0.995;
    r.position.set(left + L * u + radius * 0.6, radius, a.z.get());
    r.scale.set(radius, radius, W * 0.985 * appear);
    setOpacity(material, a.op.get());
    theme.colour("rug", material.color);
  });

  return (
    <group name={item.key}>
      <mesh ref={flat} material={material} receiveShadow />
      <mesh ref={roll} geometry={rollGeo} material={material} />
    </group>
  );
}
