import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { COUCH_BACK_DEPTH, COUCH_SEAT_HEIGHT, type CouchStyle } from "../../data/furniture";
import { MAX_CUSHIONS, type ColourAnim, type CouchItem } from "../anim/director";
import { presenceOf } from "../anim/useDirector";
import { DEG } from "../geometry";
import { MAT } from "../materials";
import { UNIT_CYLINDER, UNIT_SPHERE } from "./primitives";

/*
 * A couch built from modules: base, one seat cushion + one back cushion per
 * seat, two arms, legs. Everything is computed each frame from springs:
 *   length = inner (seats × seatWidth) + 2 × armWidth
 * so the base STRETCHES and the arms ride on its ends. `sect` (0 → 1) slides
 * the corner module out from under the right end and extends the side module
 * (L-sectional). Style is three weights (modern / curved / classic) that
 * morph arms, back, legs and details. An armchair is the same piece with one
 * seat.
 *
 * Local space: base centred on the origin, the sitter faces +z.
 */

interface StyleShape {
  legH: number;
  baseTop: number;
  backTop: number;
  armTop: number;
  cushionR: number;
  armR: number;
  backLean: number;
}

const STYLES: Record<CouchStyle, StyleShape> = {
  // Low and boxy, thin square arms, slim metal legs.
  modern: { legH: 0.11, baseTop: 0.29, backTop: 0.7, armTop: 0.55, cushionR: 0.018, armR: 0.008, backLean: 6 },
  // Rounded and soft, arms flow into the back, no visible legs.
  curved: { legH: 0, baseTop: 0.28, backTop: 0.72, armTop: 0.66, cushionR: 0.06, armR: 0.06, backLean: 8 },
  // Deep buttoned back, rolled arms, short turned wooden legs.
  classic: { legH: 0.13, baseTop: 0.3, backTop: 0.84, armTop: 0.58, cushionR: 0.03, armR: 0.02, backLean: 4 },
};

const GAP = 0.012;
const BT = COUCH_BACK_DEPTH;
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** Everything the parts need, computed once per frame from the springs. */
interface Layout {
  length: number;
  inner: number;
  sw: number;
  arm: number;
  d: number;
  legH: number;
  baseH: number;
  baseTop: number;
  backTop: number;
  armTop: number;
  cushionH: number;
  backH: number;
  cushionR: number;
  armR: number;
  lean: number;
  wm: number;
  wc: number;
  wl: number;
  puff: number;
  /** Sectional progress and corner / side module presence. */
  p: number;
  k: number;
  side: number;
  /** Corner module centre x. */
  cx: number;
  cushions: { scale: number; dy: number }[];
}

function computeLayout(item: CouchItem): Layout {
  const a = item.anim;
  const wm = Math.max(0, a.wModern.get());
  const wc = Math.max(0, a.wCurved.get());
  const wl = Math.max(0, a.wClassic.get());
  const sum = wm + wc + wl || 1;
  const blend = (key: keyof StyleShape) =>
    (STYLES.modern[key] * wm + STYLES.curved[key] * wc + STYLES.classic[key] * wl) / sum;
  const inner = Math.max(0.05, a.inner.get());
  const arm = a.armWidth.get();
  const d = a.depth.get();
  const length = inner + 2 * arm;
  const legH = Math.max(0, blend("legH"));
  const baseTop = blend("baseTop");
  const backTop = blend("backTop");
  const p = Math.max(0, Math.min(1.08, a.sect.get()));
  const x0 = length / 2 - arm;
  return {
    length,
    inner,
    sw: a.seatWidth.get(),
    arm,
    d,
    legH,
    baseH: baseTop - legH,
    baseTop,
    backTop,
    armTop: blend("armTop"),
    cushionH: COUCH_SEAT_HEIGHT - baseTop,
    backH: backTop - baseTop,
    cushionR: blend("cushionR"),
    armR: blend("armR"),
    lean: blend("backLean") * DEG,
    wm: wm / sum,
    wc: wc / sum,
    wl: wl / sum,
    puff: a.puff.get(),
    p,
    k: smooth(p * 1.6),
    side: Math.max(0, a.sideLength.get() * p),
    // Slides out from under the right end of the base as p goes 0 → 1.
    cx: x0 + d / 2 - (1 - Math.min(1, p)) * d,
    cushions: item.cushions.map((c) => presenceOf(c, 0.08)),
  };
}

interface Out {
  w: number;
  h: number;
  d: number;
  r: number;
  x: number;
  y: number;
  z: number;
  rx: number;
  rz: number;
  k: number;
}
type PartFn = (L: Layout, o: Out) => void;
type GetLayout = (stamp: number) => Layout;

function freshOut(o: Out) {
  o.w = o.h = o.d = o.r = o.x = o.y = o.z = o.rx = o.rz = 0;
  o.k = 1;
  return o;
}

/** A soft block whose size follows the layout. The rounded geometry is only
 *  rebuilt when the size drifts >12% from the built one; in between it is
 *  scaled (a morph costs a handful of rebuilds). */
function SoftPart({ get, fn, material, cast }: { get: GetLayout; fn: PartFn; material: THREE.Material; cast?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const built = useMemo(() => ({ geo: null as THREE.BufferGeometry | null, W: 1, H: 1, D: 1, R: 0 }), []);
  const o = useMemo(() => freshOut({} as Out), []);
  useEffect(
    () => () => {
      built.geo?.dispose();
      built.geo = null;
    },
    [built],
  );
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    fn(get(state.clock.elapsedTime), freshOut(o));
    const k = o.k;
    if (k < 0.002 || o.w < 0.004 || o.h < 0.004 || o.d < 0.004) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const r = Math.max(0.001, Math.min(o.r, o.w / 2 - 0.001, o.h / 2 - 0.001, o.d / 2 - 0.001));
    const off = (v: number, ref: number) => Math.abs(v / ref - 1) > 0.12;
    if (!built.geo || off(o.w, built.W) || off(o.h, built.H) || off(o.d, built.D) || Math.abs(r - built.R) > 0.004) {
      built.geo?.dispose();
      built.geo = new RoundedBoxGeometry(o.w, o.h, o.d, 2, r);
      built.W = o.w;
      built.H = o.h;
      built.D = o.d;
      built.R = r;
      m.geometry = built.geo;
    }
    m.scale.set((o.w / built.W) * k, (o.h / built.H) * k, (o.d / built.D) * k);
    m.position.set(o.x, o.y, o.z);
    m.rotation.set(o.rx, 0, o.rz);
  });
  return <mesh ref={mesh} material={material} castShadow={cast} receiveShadow />;
}

/** A unit cylinder / sphere scaled to (w, h, d): legs, rolled arms, buttons. */
function ShapePart({ get, fn, material, shape }: { get: GetLayout; fn: PartFn; material: THREE.Material; shape: "cyl" | "sphere" }) {
  const mesh = useRef<THREE.Mesh>(null);
  const o = useMemo(() => freshOut({} as Out), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    fn(get(state.clock.elapsedTime), freshOut(o));
    const visible = o.k > 0.002 && o.w > 0.0005 && o.h > 0.0005;
    m.visible = visible;
    if (!visible) return;
    m.scale.set(o.w * o.k, o.h * o.k, o.d * o.k);
    m.position.set(o.x, o.y, o.z);
    m.rotation.set(o.rx, 0, o.rz);
  });
  return (
    <mesh ref={mesh} geometry={shape === "cyl" ? UNIT_CYLINDER : UNIT_SPHERE} material={material} />
  );
}

type PartDef = { key: string; fn: PartFn; shape?: "cyl" | "sphere"; material?: THREE.Material };

/** Only the big volumes cast directional shadows (cushions, legs and
 *  details are grounded by the contact shadows). */
const CASTS = /^(base|corner-base|side-base|shell|shell-side|back-\d|corner-back|side-back|arm-[lrs])$/;

const cushionX = (L: Layout, i: number) => -L.inner / 2 + L.sw * (i + 0.5);
const armBody = (L: Layout) => L.armTop - L.legH - L.arm * 0.62 * L.wl;

/** The part list never changes: every part reads the layout each frame. */
const PARTS: PartDef[] = (() => {
  const parts: PartDef[] = [];

  /* Base (+ corner + side module bases) */
  parts.push({
    key: "base",
    fn: (L, o) => {
      o.w = L.length;
      o.h = L.baseH;
      o.d = L.d;
      o.r = L.cushionR;
      o.y = L.legH + L.baseH / 2;
    },
  });
  parts.push({
    key: "corner-base",
    fn: (L, o) => {
      o.w = L.d;
      o.h = L.baseH * 0.998;
      o.d = L.d * 0.998;
      o.r = L.cushionR;
      o.x = L.cx;
      o.y = L.legH + L.baseH / 2;
      o.k = L.p > 0.002 ? 1 : 0;
    },
  });
  parts.push({
    key: "side-base",
    fn: (L, o) => {
      o.w = L.d;
      o.h = L.baseH;
      o.d = L.side;
      o.r = L.cushionR;
      o.x = L.cx;
      o.y = L.legH + L.baseH / 2;
      o.z = L.d / 2 + L.side / 2;
    },
  });

  /* Curved: one continuous shell the arms flow into */
  parts.push({
    key: "shell",
    fn: (L, o) => {
      const right = (L.length / 2) * (1 - L.k) + (L.cx + L.d / 2) * L.k;
      o.w = right + L.length / 2;
      o.h = L.backTop * L.wc;
      o.d = 0.14;
      o.r = 0.065;
      o.x = (right - L.length / 2) / 2;
      o.y = o.h / 2;
      o.z = -L.d / 2 + 0.07;
    },
  });
  parts.push({
    key: "shell-side",
    fn: (L, o) => {
      o.w = 0.14;
      o.h = L.backTop * L.wc * L.k;
      o.d = L.d + L.side;
      o.r = 0.065;
      o.x = L.cx + L.d / 2 - 0.07;
      o.y = o.h / 2;
      o.z = L.side / 2;
    },
  });

  /* Seat + back cushion per seat (fixed slots, presence-scaled) */
  for (let i = 0; i < MAX_CUSHIONS; i++) {
    parts.push({
      key: `seat-${i}`,
      fn: (L, o) => {
        const c = L.cushions[i]!;
        o.w = L.sw - GAP;
        o.h = L.cushionH;
        o.d = L.d - BT;
        o.r = L.cushionR;
        o.x = cushionX(L, i);
        o.y = L.baseTop + L.cushionH / 2 + c.dy;
        o.z = BT / 2;
        o.k = c.scale * L.puff;
      },
    });
    parts.push({
      key: `back-${i}`,
      fn: (L, o) => {
        const c = L.cushions[i]!;
        o.w = L.sw - GAP;
        o.h = L.backH;
        o.d = BT;
        o.r = L.cushionR * 1.2;
        o.x = cushionX(L, i);
        o.y = L.baseTop + L.backH / 2 + c.dy;
        o.z = -L.d / 2 + BT / 2;
        o.rx = -L.lean;
        o.k = c.scale * L.puff;
      },
    });
    // Classic: four buttons per back cushion.
    for (let b = 0; b < 4; b++) {
      parts.push({
        key: `button-${i}-${b}`,
        shape: "sphere",
        material: MAT.charcoalDark,
        fn: (L, o) => {
          const c = L.cushions[i]!;
          o.w = o.h = o.d = 0.014;
          o.x = cushionX(L, i) + (b % 2 ? 0.22 : -0.22) * L.sw;
          o.y = L.baseTop + L.backH / 2 + (b < 2 ? -0.12 : 0.08) + c.dy;
          o.z = -L.d / 2 + BT + 0.004;
          o.k = L.wl * c.scale;
        },
      });
    }
  }

  /* Corner + side module cushions */
  parts.push({
    key: "corner-seat",
    fn: (L, o) => {
      o.w = L.d - BT - GAP;
      o.h = L.cushionH;
      o.d = L.d - BT;
      o.r = L.cushionR;
      o.x = L.cx - BT / 2;
      o.y = L.baseTop + L.cushionH / 2;
      o.z = BT / 2;
      o.k = L.k * L.puff;
    },
  });
  parts.push({
    key: "side-seat",
    fn: (L, o) => {
      o.w = L.d - BT - GAP;
      o.h = L.cushionH;
      o.d = L.side - L.arm - GAP;
      o.r = L.cushionR;
      o.x = L.cx - BT / 2;
      o.y = L.baseTop + L.cushionH / 2;
      o.z = L.d / 2 + (L.side - L.arm) / 2;
      o.k = L.k * L.puff;
    },
  });
  parts.push({
    key: "corner-back",
    fn: (L, o) => {
      o.w = L.d;
      o.h = L.backH;
      o.d = BT;
      o.r = L.cushionR * 1.2;
      o.x = L.cx;
      o.y = L.baseTop + L.backH / 2;
      o.z = -L.d / 2 + BT / 2;
      o.rx = -L.lean;
      o.k = L.k * L.puff;
    },
  });
  parts.push({
    key: "side-back",
    fn: (L, o) => {
      o.w = BT;
      o.h = L.backH;
      o.d = L.d - BT + L.side - L.arm;
      o.r = L.cushionR * 1.2;
      o.x = L.cx + L.d / 2 - BT / 2;
      o.y = L.baseTop + L.backH / 2;
      o.z = (BT + L.side - L.arm) / 2;
      o.rz = -L.lean;
      o.k = L.k * L.puff;
    },
  });

  /* Arms (left, right, side-module end) + classic rolls */
  const arms: { key: string; place: (L: Layout) => { x: number; z: number; alongX: boolean; side: 1 | -1; k: number } }[] = [
    { key: "arm-l", place: (L) => ({ x: -L.length / 2 + L.arm / 2, z: 0, alongX: false, side: -1, k: 1 }) },
    { key: "arm-r", place: (L) => ({ x: L.length / 2 - L.arm / 2, z: 0, alongX: false, side: 1, k: 1 - L.k }) },
    { key: "arm-s", place: (L) => ({ x: L.cx, z: L.d / 2 + L.side - L.arm / 2, alongX: true, side: 1, k: L.k }) },
  ];
  for (const arm of arms) {
    parts.push({
      key: arm.key,
      fn: (L, o) => {
        const p = arm.place(L);
        const h = armBody(L);
        o.w = p.alongX ? L.d : L.arm;
        o.h = h;
        o.d = p.alongX ? L.arm : L.d;
        o.r = L.armR;
        o.x = p.x;
        o.y = L.legH + (h * p.k) / 2;
        o.z = p.z;
        o.k = p.k;
      },
    });
    parts.push({
      key: `${arm.key}-roll`,
      shape: "cyl",
      fn: (L, o) => {
        const p = arm.place(L);
        const r = L.arm * 0.62;
        o.w = r;
        o.h = L.d;
        o.d = r;
        o.x = p.alongX ? p.x : p.x + p.side * L.arm * 0.12;
        o.y = L.legH + armBody(L) * p.k;
        o.z = p.alongX ? p.z + L.arm * 0.12 : p.z;
        o.rx = p.alongX ? 0 : Math.PI / 2;
        o.rz = p.alongX ? Math.PI / 2 : 0;
        o.k = L.wl * p.k;
      },
    });
  }

  /* Legs: slim metal (modern) and short turned wood (classic) crossfade */
  const legSpots: ((L: Layout) => [number, number, number])[] = [
    (L) => [-L.length / 2 + 0.07, -L.d / 2 + 0.07, 1],
    (L) => [-L.length / 2 + 0.07, L.d / 2 - 0.07, 1],
    (L) => [L.length / 2 - 0.07, -L.d / 2 + 0.07, 1],
    (L) => [L.length / 2 - 0.07, L.d / 2 - 0.07, 1],
    (L) => [L.cx + L.d / 2 - 0.07, -L.d / 2 + 0.07, L.k],
    (L) => [L.cx + L.d / 2 - 0.07, L.d / 2 + L.side - 0.07, L.k],
    (L) => [L.cx - L.d / 2 + 0.07, L.d / 2 + L.side - 0.07, L.k],
  ];
  legSpots.forEach((spot, i) => {
    parts.push({
      key: `leg-metal-${i}`,
      shape: "cyl",
      material: MAT.metal,
      fn: (L, o) => {
        const [x, z, k] = spot(L);
        o.w = o.d = 0.011 * L.wm;
        o.h = L.legH;
        o.x = x;
        o.y = L.legH / 2;
        o.z = z;
        o.k = k;
      },
    });
    parts.push({
      key: `leg-wood-${i}`,
      shape: "cyl",
      material: MAT.wood,
      fn: (L, o) => {
        const [x, z, k] = spot(L);
        o.w = o.d = 0.022 * L.wl;
        o.h = L.legH;
        o.x = x;
        o.y = L.legH / 2;
        o.z = z;
        o.k = k;
      },
    });
    parts.push({
      key: `leg-bead-${i}`,
      shape: "sphere",
      material: MAT.wood,
      fn: (L, o) => {
        const [x, z, k] = spot(L);
        o.w = o.d = 0.034 * L.wl;
        o.h = 0.026 * L.wl;
        o.x = x;
        o.y = L.legH * 0.62;
        o.z = z;
        o.k = k;
      },
    });
  });
  return parts;
})();

export function Couch({ item, fabric }: { item: CouchItem; fabric: ColourAnim }) {
  const outer = useRef<THREE.Group>(null);
  const fabricMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95 }), []);
  useEffect(() => () => fabricMat.dispose(), [fabricMat]);

  // One layout per frame, shared by every part.
  const get = useMemo<GetLayout>(() => {
    let stamp = -1;
    let cached: Layout | null = null;
    return (s) => {
      if (s !== stamp || !cached) {
        stamp = s;
        cached = computeLayout(item);
      }
      return cached;
    };
  }, [item]);

  useFrame(() => {
    const g = outer.current;
    if (!g) return;
    const a = item.anim;
    const { scale, dy } = presenceOf(a);
    const sq = a.squash.get();
    g.position.set(a.x.get(), dy, a.z.get());
    g.rotation.y = (a.rot.get() + a.spin.get()) * DEG;
    g.scale.set(Math.max(1e-4, scale * sq), Math.max(1e-4, scale * (1 - (1 - sq) * 0.3)), Math.max(1e-4, scale));
    g.visible = scale > 0.001;
    fabricMat.color.setRGB(fabric.r.get(), fabric.g.get(), fabric.b.get(), THREE.SRGBColorSpace);
  });

  return (
    <group ref={outer} name={item.key}>
      {PARTS.map((p) =>
        p.shape ? (
          <ShapePart key={p.key} get={get} fn={p.fn} shape={p.shape} material={p.material ?? fabricMat} />
        ) : (
          <SoftPart key={p.key} get={get} fn={p.fn} material={p.material ?? fabricMat} cast={CASTS.test(p.key)} />
        ),
      )}
    </group>
  );
}
