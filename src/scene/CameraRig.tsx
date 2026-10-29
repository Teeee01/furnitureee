import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Director, Frame } from "./anim/director";

/*
 * Isometric orthographic camera: looks along (-1, -1, -1), i.e. 45° around
 * and ~35° down. It frames the setup's real extent (furniture, person,
 * plant, sign, platform — computed by the director for each layout) with the
 * same margin every time: small setups zoom in, big ones out. The extent
 * rides on the camera spring, softer than the table's, so the camera lags
 * slightly behind the furniture ("the room grows").
 */

const DIR = new THREE.Vector3(1, 1, 1).normalize();
const RIGHT = new THREE.Vector3(1, 0, -1).normalize();
const UP = new THREE.Vector3(-1, 2, -1).normalize();
const DISTANCE = 40;

/** Margins as a share of the view; the bottom also leaves room for the
 *  caption and the cart button. */
const MARGIN_X = 0.075;
const MARGIN_TOP = 0.1;
const MARGIN_BOTTOM = 0.1;
const CAPTION_PX = 36;

const target = new THREE.Vector3();

export function fitFrame(f: Frame, viewW: number, viewH: number) {
  const mx = viewW * MARGIN_X;
  const mt = viewH * MARGIN_TOP;
  const mb = viewH * MARGIN_BOTTOM + (viewH > 320 ? CAPTION_PX : 0);
  const zoom = Math.min((viewW - 2 * mx) / (f.maxX - f.minX), (viewH - mt - mb) / (f.maxY - f.minY));
  // Centre the set in the space between the top and bottom margins.
  const cx = (f.minX + f.maxX) / 2;
  const cy = (f.minY + f.maxY) / 2 - (mb - mt) / 2 / zoom;
  return { zoom, cx, cy };
}

const frame: Frame = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

export function CameraRig({ director }: { director: Director }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  useFrame(() => {
    const f = director.platform.frame;
    frame.minX = f.minX.get();
    frame.maxX = f.maxX.get();
    frame.minY = f.minY.get();
    frame.maxY = f.maxY.get();
    const { zoom, cx, cy } = fitFrame(frame, size.width, size.height);
    target.copy(RIGHT).multiplyScalar(cx).addScaledVector(UP, cy);
    camera.position.copy(target).addScaledVector(DIR, DISTANCE);
    camera.lookAt(target);
    if (Math.abs(camera.zoom - zoom) > 1e-6) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}
