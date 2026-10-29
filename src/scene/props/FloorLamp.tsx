import * as THREE from "three";
import { MAT } from "../materials";
import { Rod } from "../furniture/primitives";

const shadeGeo = new THREE.CylinderGeometry(0.13, 0.19, 0.26, 24, 1, true);
export const shadeMat = new THREE.MeshStandardMaterial({ color: "#3A3A41", roughness: 0.9, side: THREE.DoubleSide });

/* A floor lamp: weighted disc, thin pole, open drum shade. Origin on the floor. */
export function FloorLamp() {
  return (
    <group>
      <Rod radius={0.14} height={0.022} base={[0, 0, 0]} material={MAT.charcoalDark} />
      <Rod radius={0.011} height={1.36} base={[0, 0, 0]} material={MAT.metal} />
      <mesh geometry={shadeGeo} material={shadeMat} position-y={1.42} />
    </group>
  );
}
