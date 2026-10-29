import * as THREE from "three";

/** Shared unit geometries, scaled per use (no per-instance allocations). */
export const UNIT_CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 16);
export const UNIT_SPHERE = new THREE.SphereGeometry(1, 16, 12);

type V3 = [number, number, number];

/** A vertical cylinder by radius, height and base centre. */
export function Rod({ radius, height, base, material }: { radius: number; height: number; base: V3; material: THREE.Material }) {
  return (
    <mesh
      geometry={UNIT_CYLINDER}
      material={material}
      scale={[radius, height, radius]}
      position={[base[0], base[1] + height / 2, base[2]]}
    />
  );
}
