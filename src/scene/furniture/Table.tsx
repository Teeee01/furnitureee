import { useFrame } from "@react-three/fiber";
import { useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import type { TableBase as TableBaseKind } from "../../data/furniture";
import type { ColourAnim, TableItem } from "../anim/director";
import type { SceneTheme } from "../sceneTheme";
import { presenceOf } from "../anim/useDirector";
import { DEG, setOpacity, useLiveSlab, useOwnMaterial } from "../geometry";
import { MAT } from "../materials";

/**
 * A table = ONE extruded rounded-rectangle top + a base, driven by springs.
 * Each frame the top is rebuilt from (length, width, radius, thickness) when
 * those move, so round → pill → long pill is a stretch, never a swap. The
 * pedestal / legs / cabinet follow the same numbers.
 */
export function Table({ item, colour, theme }: { item: TableItem; colour: ColourAnim; theme: SceneTheme }) {
  const group = useRef<THREE.Group>(null);
  const top = useRef<THREE.Mesh>(null);
  const topSlab = useLiveSlab();
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.55 }), []);
  // The edge is a shade darker than the top (more so in the light theme, so
  // a white top doesn't disappear into a light platform).
  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.55 }), []);
  const topMats = useMemo(() => [topMat, edgeMat], [topMat, edgeMat]);
  useEffect(
    () => () => {
      topMat.dispose();
      edgeMat.dispose();
    },
    [topMat, edgeMat],
  );
  const baseMat = useOwnMaterial(MAT.charcoalDark);
  const bodyMat = useOwnMaterial(MAT.charcoal);
  const base = useRef<BaseHandle>(null);

  useFrame(() => {
    const a = item.anim;
    const g = group.current;
    const t = top.current;
    if (!g || !t) return;
    const { scale, dy } = presenceOf(a);
    const sq = a.squash.get();
    const length = a.length.get();
    const width = a.width.get();
    const radius = a.radius.get();
    const thickness = a.thickness.get();
    const height = a.height.get();

    g.position.set(a.x.get(), dy + a.dip.get(), a.z.get());
    g.rotation.y = (a.rot.get() + a.spin.get()) * DEG;
    g.scale.set(scale * sq, scale * (1 - (1 - sq) * 0.25), scale * sq);
    g.visible = scale > 0.001;

    if (topSlab.update({ length, width, radius, thickness, bevel: Math.min(0.012, thickness / 3), curveSegments: 40 })) {
      t.geometry = topSlab.geometry!;
    }
    t.position.y = height - thickness;
    topMat.color.setRGB(colour.r.get(), colour.g.get(), colour.b.get(), THREE.SRGBColorSpace);
    edgeMat.color.copy(topMat.color).multiplyScalar(theme.number("tableEdge"));
    // Bases follow the theme's charcoal / warm grey.
    baseMat.color.copy(MAT.charcoalDark.color);
    bodyMat.color.copy(MAT.charcoal.color);

    const op = a.op.get();
    setOpacity(topMat, op);
    setOpacity(edgeMat, op);
    setOpacity(baseMat, op);
    setOpacity(bodyMat, op);
    base.current?.update(length, width, radius, height - thickness);
  });

  return (
    <group ref={group} name={item.key}>
      <mesh ref={top} material={topMats} castShadow receiveShadow />
      <TableBase ref={base} kind={item.spec.base} material={baseMat} body={bodyMat} />
    </group>
  );
}

interface BaseHandle {
  update(length: number, width: number, radius: number, height: number): void;
}

/** Pedestal (round / pill), 4 thin legs, or an island cabinet — all follow
 *  the top's numbers every frame. */
function TableBase({
  kind,
  material,
  body,
  ref,
}: {
  kind: TableBaseKind;
  material: THREE.Material;
  body: THREE.Material;
  ref: React.Ref<BaseHandle>;
}) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const legs = useRef<(THREE.Mesh | null)[]>([]);
  const slabA = useLiveSlab();
  const slabB = useLiveSlab();

  const handle = useMemo<BaseHandle>(
    () => ({
      update(length, width, radius, height) {
        if (kind === "legs") {
          const inset = Math.max(0.06, Math.min(radius * 0.6, width * 0.3));
          const x = length / 2 - inset;
          const z = width / 2 - inset;
          [
            [-x, -z],
            [x, -z],
            [-x, z],
            [x, z],
          ].forEach(([lx, lz], i) => {
            const m = legs.current[i];
            if (!m) return;
            m.position.set(lx!, 0, lz!);
            m.scale.y = height;
          });
          return;
        }
        if (!a.current || !b.current) return;
        if (kind === "pedestal") {
          // Blade column + foot plate: rounded rectangles that stretch with the top.
          const stretch = Math.max(0, length - width);
          const foot = 0.03;
          const colW = 0.11;
          const footW = Math.max(0.3, width * 0.55);
          if (slabA.update({ length: footW + stretch * 0.8, width: footW, radius: footW / 2, thickness: foot, bevel: 0.008 }))
            a.current.geometry = slabA.geometry!;
          if (slabB.update({ length: colW + stretch * 0.72, width: colW, radius: colW / 2, thickness: height - foot }))
            b.current.geometry = slabB.geometry!;
          b.current.position.y = foot;
        } else {
          if (slabA.update({ length: length - 0.24, width: width * 0.56, radius: 0.03, thickness: 0.06 }))
            a.current.geometry = slabA.geometry!;
          if (slabB.update({ length: length - 0.16, width: width * 0.62, radius: 0.04, thickness: height - 0.06, bevel: 0.01 }))
            b.current.geometry = slabB.geometry!;
          b.current.position.y = 0.06;
        }
      },
    }),
    [kind, slabA, slabB],
  );
  useImperativeHandle(ref, () => handle, [handle]);

  if (kind === "legs") {
    return (
      <group>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            ref={(m) => {
              legs.current[i] = m;
            }}
            geometry={legGeo}
            material={material}
          />
        ))}
      </group>
    );
  }
  return (
    <group>
      <mesh ref={a} material={material} receiveShadow />
      <mesh ref={b} material={kind === "cabinet" ? body : material} castShadow receiveShadow />
    </group>
  );
}

const legGeo = new THREE.CylinderGeometry(0.017, 0.013, 1, 10);
legGeo.translate(0, 0.5, 0);
