import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Director } from "./anim/director";
import { setOpacity, useLiveSlab } from "./geometry";
import { MAT } from "./materials";

export const PLATFORM_THICKNESS = 0.25;
/** Corner radius as a share of the platform's short side. */
export const PLATFORM_CORNER = 0.12;

/** The thick floating slab, resized by the morph spring. Its top face is
 *  y = 0; top slightly lighter than the sides (groups: 0 caps, 1 sides). */
export function Platform({ director }: { director: Director }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const slab = useLiveSlab(0.002);
  const materials = useMemo(() => [MAT.platformTop, MAT.platformSide], []);
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false, color: "#000000" }),
    [],
  );

  useFrame(() => {
    const length = director.platform.length.get();
    const width = director.platform.width.get();
    if (
      mesh.current &&
      slab.update({
        length,
        width,
        radius: Math.min(length, width) * PLATFORM_CORNER,
        thickness: PLATFORM_THICKNESS,
        bevel: 0.035,
        curveSegments: 24,
      })
    ) {
      mesh.current.geometry = slab.geometry!;
    }
    shadow.current?.scale.set(length * 1.7 + 0.8, 1, width * 1.7 + 0.8);
    // First-load fade-up.
    const op = director.platform.op.get();
    group.current?.scale.setScalar(director.platform.s.get());
    setOpacity(MAT.platformTop, op);
    setOpacity(MAT.platformSide, op);
    // Soft shadow under the platform: colour and strength from the theme.
    director.theme.colour("floorShadow", shadowMat.color);
    shadowMat.opacity = op * director.theme.number("floorShadowOpacity");
  });

  return (
    <group ref={group}>
      <mesh ref={mesh} material={materials} position-y={-PLATFORM_THICKNESS} receiveShadow />
      {/* The large soft, blurred shadow the platform floats over */}
      <mesh ref={shadow} userData={{ noFrame: true }} geometry={shadowGeo} material={shadowMat} position={[0.15, -0.75, 0.15]} renderOrder={-1} />
    </group>
  );
}

let shadowTexture: THREE.CanvasTexture | null = null;
function getShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // White alpha ramp; the material colour tints it (black / warm brown).
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}

const shadowGeo = new THREE.PlaneGeometry(1, 1);
shadowGeo.rotateX(-Math.PI / 2);
