import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Category, CouchStyle, SizeOption } from "../data/furniture";
import { buildTarget, Director, hexToRgb } from "./anim/director";
import { DirectorContext } from "./anim/useDirector";
import { Room } from "./Room";

export interface SceneProps {
  category: Category;
  slot: number;
  size: SizeOption;
  style: CouchStyle;
  tabletop: string;
  fabric: string;
  reduced: boolean;
}

/**
 * The 3D scene: transparent canvas over the page background, isometric
 * orthographic camera (CameraRig), one warm key light with soft shadows and
 * a low fill. Selection changes are handed to the Director, which turns them
 * into springs.
 */
export function Scene(props: SceneProps) {
  const { category, slot, size, style, tabletop, fabric, reduced } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const [director] = useState(
    () => new Director(buildTarget(category, size), style, hexToRgb(tabletop), hexToRgb(fabric)),
  );

  // Dev only: inspect the springs from the console (window.__forma).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __forma: Director }).__forma = director;
  }, [director]);

  // Layout: size or category change.
  const last = useRef({ category: category.id, slot });
  useEffect(() => {
    const prev = last.current;
    if (prev.category === category.id && prev.slot === slot) return;
    last.current = { category: category.id, slot };
    director.change(buildTarget(category, size), prev.category !== category.id ? "category" : "size");
  }, [director, category, slot, size]);

  useEffect(() => director.setStyle(style), [director, style]);

  // Finish: the tabletop keeps its wood colour while the living room is shown.
  const lastTop = useRef(tabletop);
  useEffect(() => {
    if (category.finishTarget === "tabletop") lastTop.current = tabletop;
    director.setColours(hexToRgb(lastTop.current), hexToRgb(fabric));
  }, [director, tabletop, fabric, category.finishTarget]);

  useEffect(() => {
    director.setReduced(reduced);
    director.dipEl = wrap.current;
  }, [director, reduced]);

  // Pause rendering while the tab is hidden.
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
          orthographic
          camera={{ position: [20, 20, 20], zoom: 100, near: 0.1, far: 200 }}
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          gl={{ antialias: true, alpha: true }}
          aria-hidden="true"
        >
          <Lights />
          <Suspense fallback={null}>
            <DirectorContext.Provider value={director}>
              <Room director={director} name={size.name} idle={!reduced} />
            </DirectorContext.Provider>
          </Suspense>
        </Canvas>
    </div>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.32} color="#C9CCD6" />
      <hemisphereLight intensity={0.35} color="#E6E3DC" groundColor="#0E0E10" />
      {/* Warm-white key from the top-left-back */}
      <directionalLight
        position={[-4.5, 9, -3]}
        intensity={3}
        color="#FFF1DD"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      {/* Faint cool rim from the front-right so dark pieces keep their edges */}
      <directionalLight position={[6, 3, 5]} intensity={0.35} color="#B9C2DA" />
    </>
  );
}
