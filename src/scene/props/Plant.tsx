import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Director } from "../anim/director";
import { presenceOf } from "../anim/useDirector";
import { DEG } from "../geometry";
import { MAT } from "../materials";

/*
 * Potted plant: a tapered charcoal pot and a clump of long, faceted leaves.
 * Sits in the platform's back corner (follows the platform spring). Idle:
 * the leaves sway ±1.5°.
 */

const potGeo = new THREE.CylinderGeometry(0.15, 0.115, 0.34, 20);
potGeo.translate(0, 0.17, 0);
const soilGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.01, 20);
// A leaf: a flattened, faceted spindle with its base at the origin.
const leafGeo = new THREE.SphereGeometry(1, 6, 6);
leafGeo.translate(0, 1, 0);

const LEAVES = Array.from({ length: 13 }, (_, i) => {
  const yaw = i * 137.5 * (Math.PI / 180);
  const tilt = 0.22 + (i % 4) * 0.13;
  const len = 0.2 + ((i * 7) % 5) * 0.035;
  return { yaw, tilt, len, dark: i % 3 === 0 };
});

/** All leaves of one colour merged into one geometry (2 draw calls). */
function leavesGeometry(dark: boolean) {
  const list = LEAVES.filter((l) => l.dark === dark).map((l) => {
    const g = leafGeo.clone();
    g.scale(0.05, l.len, 0.016);
    g.rotateX(l.tilt);
    g.rotateY(l.yaw);
    return g;
  });
  const merged = mergeGeometries(list)!;
  list.forEach((g) => g.dispose());
  return merged;
}
const leavesLight = leavesGeometry(false);
const leavesDark = leavesGeometry(true);

export function Plant({ director, inset, idle }: { director: Director; inset: number; idle: boolean }) {
  const root = useRef<THREE.Group>(null);
  const leavesRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const p = director.platform;
    const r = root.current;
    if (r) {
      const { scale, dy } = presenceOf(director.props.plant);
      r.position.set(-p.length.get() / 2 + inset, dy, -p.width.get() / 2 + inset);
      r.scale.setScalar(Math.max(1e-4, scale));
      r.visible = scale > 0.001;
    }
    const l = leavesRef.current;
    if (!l) return;
    const t = state.clock.elapsedTime;
    const amp = idle ? 1.5 * DEG : 0;
    l.rotation.x = Math.sin(t * 0.9) * amp;
    l.rotation.z = Math.sin(t * 0.7 + 1.3) * amp;
  });
  return (
    <group ref={root} name="plant">
      <mesh geometry={potGeo} material={MAT.charcoal} castShadow receiveShadow />
      <mesh geometry={soilGeo} material={MAT.charcoalDark} position-y={0.325} />
      <group ref={leavesRef} position-y={0.32}>
        <mesh geometry={leavesLight} material={MAT.plant} />
        <mesh geometry={leavesDark} material={MAT.plantDark} />
      </group>
    </group>
  );
}
