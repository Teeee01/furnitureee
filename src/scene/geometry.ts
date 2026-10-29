import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * A rounded rectangle centred on the origin in the XY plane. The radius is
 * clamped to half the short side, so (l, w, w/2) is a pill and (d, d, d/2) a
 * circle. Zero-length straight edges are dropped by three's getPoints.
 */
export function roundedRectShape(length: number, width: number, radius: number) {
  const hl = Math.max(length / 2, 0.0005);
  const hw = Math.max(width / 2, 0.0005);
  const r = Math.max(0.0002, Math.min(radius, hl, hw));
  const s = new THREE.Shape();
  s.absarc(hl - r, -hw + r, r, -Math.PI / 2, 0, false);
  s.absarc(hl - r, hw - r, r, 0, Math.PI / 2, false);
  s.absarc(-hl + r, hw - r, r, Math.PI / 2, Math.PI, false);
  s.absarc(-hl + r, -hw + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

export interface SlabParams {
  length: number;
  width: number;
  radius: number;
  thickness: number;
  /** Soft edge size. Clamped to fit the slab. */
  bevel?: number;
  curveSegments?: number;
}

/**
 * One extruded rounded rectangle lying flat: x = length, z = width, y from 0
 * (bottom) to `thickness` (top). Outer size includes the bevel.
 * Geometry groups: 0 = top + bottom caps, 1 = sides and bevels.
 */
export function createSlabGeometry({ length, width, radius, thickness, bevel = 0, curveSegments = 32 }: SlabParams) {
  const b = Math.max(0, Math.min(bevel, thickness / 2 - 0.0005, length / 4, width / 4));
  const shape = roundedRectShape(length - 2 * b, width - 2 * b, radius - b);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(thickness - 2 * b, 0.0005),
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: b > 0 ? 3 : 0,
    curveSegments,
  });
  // Extrusion runs along +z; stand it up so the slab lies flat with its
  // bottom on y = 0.
  geo.translate(0, 0, b);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Memoised slab geometry, disposed when the numbers change or on unmount.
 *  (Animated callers can call `createSlabGeometry` per frame instead.) */
export function useSlabGeometry(params: SlabParams) {
  const { length, width, radius, thickness, bevel, curveSegments } = params;
  const geo = useMemo(
    () => createSlabGeometry({ length, width, radius, thickness, bevel, curveSegments }),
    [length, width, radius, thickness, bevel, curveSegments],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

export const DEG = Math.PI / 180;

/**
 * A slab geometry that follows animated numbers: rebuilt only when a value
 * moves by more than `step` (1 mm by default), so a morph costs a few
 * rebuilds per frame at most and an idle scene costs none.
 */
export class LiveSlab {
  geometry: THREE.BufferGeometry | null = null;
  private key = "";
  constructor(private step = 0.001) {}

  /** Returns true when the geometry was rebuilt. */
  update(p: SlabParams): boolean {
    const q = (v: number) => Math.round(v / this.step);
    const key = `${q(p.length)}:${q(p.width)}:${q(p.radius)}:${q(p.thickness)}:${q(p.bevel ?? 0)}`;
    if (key === this.key && this.geometry) return false;
    this.key = key;
    this.geometry?.dispose();
    this.geometry = createSlabGeometry({
      ...p,
      length: Math.max(p.length, 0.002),
      width: Math.max(p.width, 0.002),
      thickness: Math.max(p.thickness, 0.002),
    });
    return true;
  }

  dispose() {
    this.geometry?.dispose();
    this.geometry = null;
  }
}

/** Keeps a LiveSlab bound to a mesh and disposed on unmount. */
export function useLiveSlab(step?: number) {
  const slab = useMemo(() => new LiveSlab(step), [step]);
  useEffect(() => () => slab.dispose(), [slab]);
  return slab;
}

/** Clone a shared material for one item (so it can fade on its own). */
export function useOwnMaterial<T extends THREE.Material>(source: T): T {
  const m = useMemo(() => source.clone() as T, [source]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/** Fade a material; only transparent while it actually is. */
export function setOpacity(m: THREE.Material, opacity: number) {
  const o = Math.max(0, Math.min(1, opacity));
  const transparent = o < 0.999;
  if (m.transparent !== transparent) {
    m.transparent = transparent;
    m.needsUpdate = true;
  }
  m.opacity = o;
}
