import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/*
 * Static models (chairs, stools, benches) are described as a list of simple
 * parts and merged into ONE geometry per material, built once and shared by
 * every copy: a 14-chair boardroom costs 28 draw calls instead of ~300.
 */

type V3 = [number, number, number];

export interface Part {
  geo: THREE.BufferGeometry;
  material: THREE.Material;
  position: V3;
  rotation?: V3;
  scale?: V3;
}

export interface MergedMesh {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 14);
const unitSphere = new THREE.SphereGeometry(1, 12, 8);
const roundedCache = new Map<string, THREE.BufferGeometry>();

export const part = {
  box: (size: V3, position: V3, material: THREE.Material, rotation?: V3): Part => ({
    geo: unitBox,
    material,
    position,
    rotation,
    scale: size,
  }),
  soft: (size: V3, radius: number, position: V3, material: THREE.Material, rotation?: V3): Part => {
    const key = `${size.join(",")}:${radius}`;
    let geo = roundedCache.get(key);
    if (!geo) {
      geo = new RoundedBoxGeometry(size[0], size[1], size[2], 2, radius);
      roundedCache.set(key, geo);
    }
    return { geo, material, position, rotation };
  },
  /** Vertical cylinder by radius, height and base centre. */
  rod: (radius: number, height: number, base: V3, material: THREE.Material): Part => ({
    geo: unitCyl,
    material,
    position: [base[0], base[1] + height / 2, base[2]],
    scale: [radius, height, radius],
  }),
  sphere: (radius: number, position: V3, material: THREE.Material): Part => ({
    geo: unitSphere,
    material,
    position,
    scale: [radius, radius, radius],
  }),
  geo: (geo: THREE.BufferGeometry, position: V3, material: THREE.Material, rotation?: V3): Part => ({
    geo,
    material,
    position,
    rotation,
  }),
};

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();

/** Merge parts into one geometry per material. */
export function mergeParts(parts: Part[]): MergedMesh[] {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const p of parts) {
    // Non-indexed copies (RoundedBoxGeometry has no index; the rest do), with
    // only the attributes every primitive has, so they all merge.
    const src = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    const g = src;
    for (const name of Object.keys(g.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
    }
    q.setFromEuler(e.set(...(p.rotation ?? [0, 0, 0])));
    m.compose(new THREE.Vector3(...p.position), q, new THREE.Vector3(...(p.scale ?? [1, 1, 1])));
    g.applyMatrix4(m);
    g.clearGroups();
    const list = byMat.get(p.material) ?? [];
    list.push(g);
    byMat.set(p.material, list);
  }
  const out: MergedMesh[] = [];
  for (const [material, list] of byMat) {
    const geometry = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (geometry) out.push({ geometry, material });
  }
  return out;
}

const modelCache = new Map<string, MergedMesh[]>();

/** A merged model, built on first use and cached by key. */
export function model(key: string, build: () => Part[]) {
  let merged = modelCache.get(key);
  if (!merged) {
    merged = mergeParts(build());
    modelCache.set(key, merged);
  }
  return merged;
}
