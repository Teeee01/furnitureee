import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Category, CouchStyle, SizeOption } from "../data/furniture";
import { buildTarget, Director, EMPTY_CAST, emptyTarget, hexToRgb } from "./anim/director";
import { DirectorContext } from "./anim/useDirector";
import { Room } from "./Room";
import { themedTabletop } from "./sceneTheme";
import { THEMES, type ThemeName } from "../theme";

export interface SceneProps {
  category: Category;
  slot: number;
  size: SizeOption;
  style: CouchStyle;
  tabletop: string;
  fabric: string;
  reduced: boolean;
  theme: ThemeName;
  /** configurator: follows the selection. empty: the platform and the plant
   *  only (empty cart). showcase: one fixed setup (order confirmation). */
  variant?: "configurator" | "empty" | "showcase";
  /** Showcase: a soft ring spreads across the platform once it has settled. */
  pulse?: boolean;
  /** Receives the scene's snapshot function once the canvas exists. */
  onReady?: (api: SceneApi) => void;
}

export interface SceneApi {
  /** A square snapshot of the current frame (data URL), or null. */
  capture(): string | null;
}

/**
 * The 3D scene: transparent canvas over the page background, isometric
 * orthographic camera (CameraRig), one warm key light with soft shadows and
 * a low fill. Selection changes are handed to the Director, which turns them
 * into springs.
 */
export function Scene(props: SceneProps) {
  const { category, slot, size, style, tabletop, fabric, reduced, theme, variant = "configurator", pulse, onReady } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const [director] = useState(
    () =>
      new Director(
        variant === "empty" ? emptyTarget() : buildTarget(category, size),
        style,
        hexToRgb(themedTabletop(tabletop, theme)),
        hexToRgb(fabric),
        theme,
        variant === "empty" ? EMPTY_CAST : undefined,
      ),
  );

  // Dev only: inspect the springs from the console (window.__forma).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __forma: Director }).__forma = director;
  }, [director]);

  // Layout: size or category change.
  const last = useRef({ category: category.id, slot });
  useEffect(() => {
    const prev = last.current;
    if (variant !== "configurator") return;
    if (prev.category === category.id && prev.slot === slot) return;
    last.current = { category: category.id, slot };
    director.change(buildTarget(category, size), prev.category !== category.id ? "category" : "size");
  }, [director, category, slot, size, variant]);

  useEffect(() => director.setStyle(style), [director, style]);

  // Finish: the tabletop keeps its wood colour while the living room is shown.
  const lastTop = useRef(tabletop);
  useEffect(() => {
    if (category.finishTarget === "tabletop") lastTop.current = tabletop;
    director.setColours(
      hexToRgb(themedTabletop(lastTop.current, theme)),
      hexToRgb(fabric),
      hexToRgb(THEMES[theme].scene.matteWhite),
    );
  }, [director, tabletop, fabric, category.finishTarget, theme]);

  // Theme: scene colours, lights and shadows tween; nothing moves.
  useEffect(() => director.setTheme(theme), [director, theme]);

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
          <Lights director={director} />
          <Suspense fallback={null}>
            <DirectorContext.Provider value={director}>
              <Room director={director} name={size.name} idle={!reduced} pulse={pulse} />
              {onReady && <CaptureBridge onReady={onReady} />}
            </DirectorContext.Provider>
          </Suspense>
        </Canvas>
    </div>
  );
}

/** Square snapshot of the canvas, drawn right after a fresh render (no
 *  preserveDrawingBuffer needed), downscaled to a small WebP. */
function CaptureBridge({ onReady }: { onReady: (api: SceneApi) => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    onReady({
      capture() {
        try {
          gl.render(scene, camera);
          const src = gl.domElement;
          const side = Math.min(src.width, src.height);
          const out = document.createElement("canvas");
          const size = 360;
          out.width = out.height = size;
          const ctx = out.getContext("2d");
          if (!ctx || side === 0) return null;
          ctx.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, size, size);
          const webp = out.toDataURL("image/webp", 0.82);
          if (webp.startsWith("data:image/webp")) return webp;
          // No WebP encoder (older Safari): a smaller PNG.
          const small = document.createElement("canvas");
          small.width = small.height = 200;
          small.getContext("2d")?.drawImage(out, 0, 0, 200, 200);
          return small.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    });
  }, [gl, scene, camera, onReady]);
  return null;
}

/** Lights and shadow strengths follow the theme springs (400 ms tween). */
function Lights({ director }: { director: Director }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const t = director.theme;
    if (ambient.current) ambient.current.intensity = t.number("ambient");
    if (hemi.current) {
      hemi.current.intensity = t.number("hemisphere");
      t.colour("platformSide", hemi.current.groundColor);
    }
    if (key.current) {
      key.current.intensity = t.number("key");
      key.current.shadow.intensity = t.number("shadow");
    }
    if (rim.current) rim.current.intensity = t.number("rim");
  });
  return (
    <>
      <ambientLight ref={ambient} color="#C9CCD6" />
      <hemisphereLight ref={hemi} color="#E6E3DC" />
      {/* Warm-white key from the top-left-back */}
      <directionalLight
        ref={key}
        position={[-4.5, 9, -3]}
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
      <directionalLight ref={rim} position={[6, 3, 5]} color="#B9C2DA" />
    </>
  );
}
