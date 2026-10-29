import { SpringValue } from "@react-spring/three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SPRING, T } from "../anim/config";
import { enterScale, type Director } from "../anim/director";
import { DEG } from "../geometry";
import { MAT } from "../materials";

/*
 * The seated person: a stylised low-poly figure (dark hair, blue sweater,
 * dark trousers). Local space: the origin is the point on the seat surface,
 * the person faces +z. Position, facing, seat height and pose (hips, lean,
 * arms) are all springs in the director, so they GLIDE to a new seat and
 * blend from upright to lounging — never teleport.
 * Replaceable by a rigged GLB with the same origin and facing.
 */

const torsoGeo = new THREE.CylinderGeometry(0.95, 0.82, 1, 8);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const headGeo = new THREE.IcosahedronGeometry(0.105, 1);
const hairGeo = new THREE.IcosahedronGeometry(0.114, 1);
const neckGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.08, 7);

type MeshRef = React.RefObject<THREE.Mesh | null>;

export function Person({ director, idle }: { director: Director; idle: boolean }) {
  const a = director.person;
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Mesh>(null);
  const thighs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const shins = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const feet = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const upper = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const fore = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];

  // Idle: the head turns slightly every ~4 s (a soft spring), once settled.
  const headYaw = useMemo(() => new SpringValue(0), []);
  useEffect(() => {
    if (!idle) {
      headYaw.start({ to: 0, config: SPRING.soft });
      return;
    }
    let side = 1;
    const id = setInterval(() => {
      if (performance.now() - director.lastChange < 1500) return;
      side = -side;
      headYaw.start({ to: side * (6 + Math.random() * 6), config: SPRING.soft });
      setTimeout(() => headYaw.start({ to: 0, config: SPRING.soft }), 1600);
    }, T.headTurnEvery);
    return () => clearInterval(id);
  }, [idle, director, headYaw]);

  useFrame(() => {
    const g = root.current;
    if (!g || !torso.current || !head.current || !hips.current) return;
    const seatHeight = a.seatHeight.get();
    const hipZ = a.hipZ.get();
    const lean = a.lean.get() * DEG;
    const ua = a.upperArm.get() * DEG;
    const fa = a.forearm.get() * DEG;

    const enter = Math.max(0, a.s.get());
    g.position.set(a.x.get(), seatHeight + Math.max(0, a.dy.get()), a.z.get());
    g.rotation.y = a.rot.get() * DEG;
    g.scale.setScalar(Math.max(1e-4, enterScale(enter)));
    g.visible = enter > 0.001;
    hips.current.position.z = hipZ;

    // Feet on the floor, or dangling from a tall stool.
    const kneeY = 0.07;
    const kneeZ = hipZ + 0.4;
    const footY = Math.max(-seatHeight + 0.035, kneeY - 0.52);
    const shin = Math.max(0.05, kneeY - (footY + 0.035));
    for (let i = 0; i < 2; i++) {
      thighs[i]!.current?.position.setZ(hipZ + 0.2);
      const s = shins[i]!.current;
      if (s) {
        s.position.set(s.position.x, kneeY - shin / 2, kneeZ);
        s.scale.y = shin;
      }
      const foot = feet[i]!.current;
      foot?.position.set(foot.position.x, footY, kneeZ + 0.05);
      const u = upper[i]!.current;
      if (u) {
        u.position.set(u.position.x, 0.44 - 0.145 * Math.cos(ua), -0.145 * Math.sin(ua));
        u.rotation.x = ua;
      }
      const f = fore[i]!.current;
      if (f) {
        f.position.set(f.position.x, 0.44 - 0.29 * Math.cos(ua), -0.29 * Math.sin(ua));
        f.rotation.x = lean + fa;
      }
    }
    torso.current.position.z = hipZ - 0.03;
    torso.current.rotation.x = -lean;
    head.current.rotation.y = headYaw.get() * DEG;
  });

  const part = (ref: MeshRef | null, size: [number, number, number], position: [number, number, number], material: THREE.Material, geometry: THREE.BufferGeometry = boxGeo) => (
    <mesh ref={ref ?? undefined} geometry={geometry} material={material} scale={size} position={position} castShadow={geometry === torsoGeo} />
  );

  return (
    <group ref={root} name="person">
      <mesh ref={hips} geometry={boxGeo} material={MAT.trousers} scale={[0.34, 0.15, 0.26]} position-y={0.075} />
      {[-1, 1].map((s, i) => (
        <group key={s}>
          {part(thighs[i]!, [0.145, 0.14, 0.44], [s * 0.088, 0.075, 0], MAT.trousers)}
          {part(shins[i]!, [0.12, 1, 0.125], [s * 0.088, 0, 0], MAT.trousers)}
          {part(feet[i]!, [0.105, 0.07, 0.22], [s * 0.088, 0, 0], MAT.shoes)}
        </group>
      ))}

      {/* Upper body leans back from the hips */}
      <group ref={torso} position-y={0.12}>
        {part(null, [0.2, 0.5, 0.125], [0, 0.25, 0], MAT.sweater, torsoGeo)}
        <mesh geometry={neckGeo} material={MAT.skin} position={[0, 0.53, 0]} />
        <group ref={head} position={[0, 0.65, 0.005]}>
          <mesh geometry={headGeo} material={MAT.skin} castShadow />
          <mesh geometry={hairGeo} material={MAT.hair} position={[0, 0.032, -0.03]} scale={[1, 0.86, 1]} />
        </group>
        {[-1, 1].map((s, i) => (
          <group key={s}>
            {part(upper[i]!, [0.09, 0.31, 0.1], [s * 0.235, 0, 0], MAT.sweater)}
            <group ref={fore[i]!} position={[s * 0.235, 0, 0]}>
              {part(null, [0.08, 0.08, 0.28], [0, 0, 0.13], MAT.sweater)}
              {part(null, [0.065, 0.06, 0.08], [0, 0, 0.3], MAT.skin)}
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
