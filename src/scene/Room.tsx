import { SpringValue } from "@react-spring/three";
import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { SPRING } from "./anim/config";
import type { Director, Item } from "./anim/director";
import { useItems } from "./anim/useDirector";
import { CameraRig } from "./CameraRig";
import { DEG } from "./geometry";
import { PLANT_INSET } from "./layout";
import { MAT } from "./materials";
import { Platform } from "./Platform";
import { Seat } from "./furniture/Chairs";
import { Couch } from "./furniture/Couch";
import { Table } from "./furniture/Table";
import { FloorLamp, shadeMat } from "./props/FloorLamp";
import { Laptop } from "./props/Laptop";
import { Person } from "./props/Person";
import { Plant } from "./props/Plant";
import { PresenceGroup } from "./props/PresenceGroup";
import { getRugTexture, Rug } from "./props/Rug";
import { Sign } from "./props/Sign";

/** Mouse tilt, degrees. */
const TILT = 2;

/**
 * The stage: platform, camera, the director's items, the person and the
 * props that persist across every setup. Items mount / unmount as the
 * director adds and retires them; all motion is read from springs per frame.
 */
export function Room({ director, name, idle }: { director: Director; name: string; idle: boolean }) {
  const items = useItems();
  const busy = useBusy(director);
  const contact = useRef<THREE.Group>(null);
  useThemeMaterials(director, contact);
  const three = useThree();
  useEffect(() => {
    // Dev only: the three.js state, for the framing / layout audit.
    if (import.meta.env.DEV) (window as unknown as { __formaThree: unknown }).__formaThree = three;
  }, [three]);

  // First load: start the entrance once the scene has drawn (and compiled) a
  // couple of frames, so nothing pops while shaders compile.
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => director.intro());
    });
    return () => cancelAnimationFrame(raf);
  }, [director]);

  return (
    <>
      <CameraRig director={director} />
      <Tilt enabled={idle}>
        <Platform director={director} />
        {/* Re-rendered every frame only while something moves. */}
        {/* userData.noFrame: left out of the dev framing audit */}
        <ContactShadows
          ref={contact}
          userData={{ noFrame: true }}
          position-y={0.003}
          scale={9}
          resolution={768}
          far={1.4}
          blur={2.4}
          opacity={1}
          color="#000000"
          frames={busy ? Infinity : 1}
        />
        {items.map((item) => (
          <ItemView key={item.id} item={item} director={director} />
        ))}
        <Person director={director} idle={idle} />
        <Plant director={director} inset={PLANT_INSET} idle={idle} />
        <Sign director={director} text={name} />
        <Warmup />
      </Tilt>
    </>
  );
}

/**
 * Shared materials (platform, charcoal pieces, sign, lamp shade) and the
 * contact-shadow strength follow the theme springs every frame.
 */
function useThemeMaterials(director: Director, contact: React.RefObject<THREE.Group | null>) {
  useFrame(() => {
    const t = director.theme;
    t.colour("platformTop", MAT.platformTop.color);
    t.colour("platformSide", MAT.platformSide.color);
    t.colour("charcoal", MAT.charcoal.color);
    t.colour("charcoalDark", MAT.charcoalDark.color);
    t.colour("charcoalLight", MAT.charcoalLight.color);
    t.colour("metal", MAT.metal.color);
    t.colour("wood", MAT.wood.color);
    t.colour("sign", MAT.sign.color);
    t.colour("charcoalLight", shadeMat.color);
    const plane = contact.current?.children.find((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh);
    if (plane) (plane.material as THREE.MeshBasicMaterial).opacity = t.number("contactShadow");
  });
}

/**
 * True while the director may be moving things. While idle, the contact
 * shadows stop re-rendering and the directional shadow map refreshes only
 * every few frames (the idle sway and head turn don't need more).
 */
function useBusy(director: Director) {
  const [busy, setBusy] = useState(true);
  const frame = useRef(0);
  useFrame(({ gl }) => {
    const now = performance.now() < director.busyUntil;
    if (now !== busy) setBusy(now);
    gl.shadowMap.autoUpdate = false;
    frame.current++;
    if (now || frame.current % 6 === 0) gl.shadowMap.needsUpdate = true;
  });
  return busy;
}

function ItemView({ item, director }: { item: Item; director: Director }) {
  switch (item.type) {
    case "table":
      return <Table item={item} colour={item.extra ? director.neutralTop : director.tabletop} theme={director.theme} />;
    case "seat":
      return <Seat item={item} />;
    case "couch":
      return <Couch item={item} fabric={director.fabric} />;
    case "laptop":
      return (
        <PresenceGroup anim={item.anim} name={item.key}>
          <Laptop />
        </PresenceGroup>
      );
    case "lamp":
      return (
        <PresenceGroup anim={item.anim} name={item.key}>
          <FloorLamp />
        </PresenceGroup>
      );
    case "rug":
      return <Rug item={item} theme={director.theme} />;
  }
}

/** The whole set tilts up to 2° toward the mouse, eased by a soft spring. */
function Tilt({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const tilt = useMemo(() => ({ x: new SpringValue(0), y: new SpringValue(0) }), []);
  useEffect(() => {
    if (!enabled) {
      tilt.x.start({ to: 0, config: SPRING.soft });
      tilt.y.start({ to: 0, config: SPRING.soft });
      return;
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      tilt.x.start({ to: ny * TILT, config: SPRING.soft });
      tilt.y.start({ to: nx * TILT, config: SPRING.soft });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, tilt]);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.rotation.x = tilt.x.get() * DEG * 0.7;
    g.rotation.y = tilt.y.get() * DEG;
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Materials that only appear in some setups (the rug's textured material,
 * the double-sided lamp shade) would compile their shaders the first time
 * they show up, mid-animation. Two specks hidden under the platform make
 * them compile at load instead.
 */
function Warmup() {
  const rugMat = useMemo(() => new THREE.MeshStandardMaterial({ map: getRugTexture(), roughness: 1 }), []);
  useEffect(() => () => rugMat.dispose(), [rugMat]);
  return (
    <group position-y={-0.2} scale={1e-4} userData={{ noFrame: true }}>
      <mesh material={rugMat} receiveShadow castShadow>
        <boxGeometry />
      </mesh>
      <mesh material={shadeMat} castShadow>
        <boxGeometry />
      </mesh>
    </group>
  );
}
