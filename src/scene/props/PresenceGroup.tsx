import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { PointAnim } from "../anim/director";
import { presenceOf } from "../anim/useDirector";
import { DEG } from "../geometry";

/** Places a static model with an item's springs (position, facing, the
 *  enter / exit scale, drop and turn). */
export function PresenceGroup({ anim, name, children }: { anim: PointAnim; name: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { scale, dy } = presenceOf(anim);
    g.position.set(anim.x.get(), anim.y.get() + dy, anim.z.get());
    g.rotation.y = (anim.rot.get() + anim.spin.get()) * DEG;
    g.scale.setScalar(Math.max(scale, 1e-4));
    g.visible = scale > 0.001;
  });
  return (
    <group ref={ref} name={name}>
      {children}
    </group>
  );
}
