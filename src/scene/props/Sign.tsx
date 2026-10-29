import { SpringValue } from "@react-spring/three";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import interMedium from "@fontsource/inter/files/inter-latin-500-normal.woff?url";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Director } from "../anim/director";
import { presenceOf } from "../anim/useDirector";
import { SIGN_BOARD, signInset, signScale } from "../layout";
import { TWEEN } from "../anim/config";
import { DEG, useOwnMaterial, useSlabGeometry } from "../geometry";
import { MAT } from "../materials";
import { Rod } from "../furniture/primitives";

/*
 * A small black floating sign on a short stand at the platform's front-left
 * corner (follows the platform spring), turned to face the camera, showing
 * the product name. A new name crossfades in over the old one (250 ms).
 */

const BOARD = SIGN_BOARD;
const FADE = { duration: 250, easing: TWEEN.colour.easing };

interface Layer {
  id: number;
  text: string;
  op: SpringValue<number>;
}

export function Sign({ director, text }: { director: Director; text: string }) {
  const root = useRef<THREE.Group>(null);
  const boardGeo = useSlabGeometry({ length: BOARD.width, width: BOARD.height, radius: 0.05, thickness: BOARD.depth, bevel: 0.006 });
  // A thin border card behind the board (visible in the light theme).
  const borderGeo = useSlabGeometry({ length: BOARD.width + 0.014, width: BOARD.height + 0.014, radius: 0.057, thickness: BOARD.depth * 0.8 });
  const borderMat = useOwnMaterial(MAT.sign);
  const nextId = useRef(1);
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 0, text, op: new SpringValue(1) }]);

  useEffect(() => {
    setLayers((prev) => {
      const current = prev[prev.length - 1];
      if (current?.text === text) return prev;
      // Fade every older layer out, the new one in.
      prev.forEach((l) => l.op.start({ to: 0, config: director.reduced ? TWEEN.reduced : FADE }));
      const op = new SpringValue(0);
      op.start({ to: 1, config: director.reduced ? TWEEN.reduced : FADE });
      return [...prev.filter((l) => l.op.goal > 0 || l.op.get() > 0.01).slice(-2), { id: nextId.current++, text, op }];
    });
  }, [text, director]);

  useFrame(() => {
    const p = director.platform;
    const g = root.current;
    if (!g) return;
    const { scale, dy } = presenceOf(director.props.sign);
    const L = p.length.get();
    const size = signScale(L);
    const inset = signInset(size);
    g.position.set(-L / 2 + inset, dy, p.width.get() / 2 - inset);
    g.scale.setScalar(Math.max(1e-4, scale * size));
    g.visible = scale > 0.001;
    director.theme.colour("signBorder", borderMat.color);
  });

  const boardY = BOARD.y;
  return (
    <group ref={root} rotation-y={45 * DEG} name="sign">
      <Rod radius={0.07} height={0.012} base={[0, 0, 0]} material={MAT.charcoalDark} />
      <Rod radius={0.009} height={boardY - BOARD.height / 2} base={[0, 0, 0]} material={MAT.charcoalDark} />
      <group position={[0, boardY, -BOARD.depth / 2]}>
        <mesh geometry={borderGeo} material={borderMat} rotation-x={Math.PI / 2} position-z={-0.002} />
        <mesh geometry={boardGeo} material={MAT.sign} rotation-x={Math.PI / 2} />
        {layers.map((l) => (
          <SignText key={l.id} layer={l} director={director} />
        ))}
      </group>
    </group>
  );
}

type TroikaText = THREE.Mesh & { fillOpacity: number; color: number };
const textColour = new THREE.Color();

function SignText({ layer, director }: { layer: Layer; director: Director }) {
  const ref = useRef<TroikaText>(null);
  const offset = useMemo(() => new THREE.Vector3(0, 0, BOARD.depth + 0.002), []);
  useFrame(() => {
    const t = ref.current;
    if (!t) return;
    const o = layer.op.get();
    t.fillOpacity = o;
    t.visible = o > 0.005;
    const hex = director.theme.colour("signText", textColour).getHex();
    if (t.color !== hex) t.color = hex;
  });
  return (
    <Text
      ref={ref}
      font={interMedium}
      fontSize={0.06}
      letterSpacing={-0.01}
      maxWidth={BOARD.width - 0.08}
      color="#F2F2F3"
      anchorX="center"
      anchorY="middle"
      position={offset}
    >
      {layer.text}
    </Text>
  );
}
