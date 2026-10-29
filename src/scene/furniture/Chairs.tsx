import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { SEAT_HEIGHT, type SeatSpec } from "../../data/furniture";
import type { SeatItem } from "../anim/director";
import { presenceOf } from "../anim/useDirector";
import { DEG } from "../geometry";
import { MAT } from "../materials";
import { model, part, type MergedMesh } from "./merge";

/*
 * Seating pieces. Local space: the sitter faces +z, the backrest is at -z,
 * the seat centre is at x = z = 0 on the floor. Each piece is its own
 * component so a GLB model can replace it (keep the same local space).
 */

/** One chair / stool / bench on stage, positioned and scaled by its springs. */
export function Seat({ item }: { item: SeatItem }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const a = item.anim;
    const { scale, dy } = presenceOf(a);
    g.position.set(a.x.get(), dy, a.z.get());
    g.rotation.y = (a.rot.get() + a.spin.get()) * DEG;
    g.scale.setScalar(Math.max(scale, 1e-4));
    g.visible = scale > 0.001;
  });
  return (
    <group ref={ref} name={item.key}>
      <SeatModel spec={item.spec} />
    </group>
  );
}

function SeatModel({ spec }: { spec: SeatSpec }) {
  switch (spec.kind) {
    case "dining":
      return <DiningChair />;
    case "office":
      return <OfficeChair />;
    case "woodChair":
      return <WoodChair />;
    case "barStool":
      return <BarStool height={spec.height ?? SEAT_HEIGHT.barStool} />;
    case "bench":
      return <Bench length={spec.length ?? 1.4} />;
    case "armchair":
      // Armchairs are 1-seat couches (see Couch); the director renders them.
      return null;
  }
}

/** Renders a merged model: one mesh per material, no shadow casting (chairs
 *  are grounded by the contact shadows; only main pieces cast). */
function Merged({ meshes }: { meshes: MergedMesh[] }) {
  return (
    <>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} receiveShadow />
      ))}
    </>
  );
}

export function DiningChair() {
  const h = SEAT_HEIGHT.dining;
  const meshes = model("dining", () => [
    part.soft([0.44, 0.05, 0.42], 0.016, [0, h - 0.025, 0.01], MAT.charcoal),
    ...[-0.19, 0.19].flatMap((x) => [
      part.box([0.03, h - 0.05, 0.03], [x, (h - 0.05) / 2, 0.18], MAT.charcoalDark),
      part.box([0.03, h + 0.36, 0.03], [x, (h + 0.36) / 2, -0.19], MAT.charcoalDark),
    ]),
    part.soft([0.42, 0.3, 0.035], 0.014, [0, h + 0.2, -0.2], MAT.charcoal, [-6 * DEG, 0, 0]),
  ]);
  return <Merged meshes={meshes} />;
}

export function OfficeChair() {
  const h = SEAT_HEIGHT.office;
  const meshes = model("office", () => [
    ...[0, 1, 2, 3, 4].flatMap((i) => {
      const a = (i * 72 + 18) * DEG;
      return [
        part.box([0.035, 0.03, 0.3], [Math.sin(a) * 0.15, 0.065, Math.cos(a) * 0.15], MAT.charcoalDark, [0, a, 0]),
        part.sphere(0.026, [Math.sin(a) * 0.29, 0.026, Math.cos(a) * 0.29], MAT.charcoalDark),
      ];
    }),
    part.rod(0.022, h - 0.14, [0, 0.07, 0], MAT.metal),
    part.box([0.18, 0.04, 0.18], [0, h - 0.1, 0], MAT.charcoalDark),
    part.soft([0.5, 0.08, 0.47], 0.03, [0, h - 0.04, 0.01], MAT.charcoal),
    part.box([0.06, 0.32, 0.03], [0, h + 0.08, -0.25], MAT.charcoalDark),
    part.soft([0.44, 0.5, 0.07], 0.035, [0, h + 0.33, -0.26], MAT.charcoal, [-10 * DEG, 0, 0]),
    ...[-0.25, 0.25].flatMap((x) => [
      part.box([0.025, 0.17, 0.025], [x, h + 0.085, -0.02], MAT.charcoalDark),
      part.soft([0.055, 0.03, 0.24], 0.012, [x, h + 0.17, -0.02], MAT.charcoalLight),
    ]),
  ]);
  return <Merged meshes={meshes} />;
}

export function WoodChair() {
  const h = SEAT_HEIGHT.woodChair;
  const meshes = model("woodChair", () => [
    part.box([0.42, 0.035, 0.4], [0, h - 0.0175, 0], MAT.wood),
    ...[-0.185, 0.185].flatMap((x) => [
      part.box([0.035, h - 0.035, 0.035], [x, (h - 0.035) / 2, 0.17], MAT.wood),
      part.box([0.035, h + 0.4, 0.035], [x, (h + 0.4) / 2, -0.18], MAT.wood),
    ]),
    ...[0.17, 0.27, 0.37].map((y) => part.box([0.34, 0.04, 0.02], [0, h + y, -0.18], MAT.wood)),
  ]);
  return <Merged meshes={meshes} />;
}

const ringGeo = new THREE.TorusGeometry(0.15, 0.009, 6, 28);

export function BarStool({ height }: { height: number }) {
  const meshes = model(`barStool:${height}`, () => [
    part.rod(0.17, 0.05, [0, height - 0.05, 0], MAT.charcoal),
    ...[
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ].map(([dx, dz]) =>
      part.box([0.025, height - 0.052, 0.025], [dx! * 0.12, (height - 0.052) / 2 + 0.003, dz! * 0.12], MAT.charcoalDark, [
        dz! * -0.07,
        0,
        dx! * 0.07,
      ]),
    ),
    part.geo(ringGeo, [0, height * 0.36, 0], MAT.charcoalDark, [Math.PI / 2, 0, 0]),
  ]);
  return <Merged meshes={meshes} />;
}

export function Bench({ length }: { length: number }) {
  const h = SEAT_HEIGHT.bench;
  const meshes = model(`bench:${length}`, () => [
    part.soft([length, 0.05, 0.36], 0.012, [0, h - 0.025, 0], MAT.wood),
    ...[-1, 1].map((s) => part.box([0.045, h - 0.05, 0.3], [s * (length / 2 - 0.12), (h - 0.05) / 2, 0], MAT.wood)),
    part.box([length - 0.24, 0.04, 0.04], [0, 0.12, 0], MAT.wood),
  ]);
  return <Merged meshes={meshes} />;
}
