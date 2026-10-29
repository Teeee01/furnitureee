/*
 * Placement rules shared by the scene and the director's camera framing.
 */

/** How far the plant sits in from the platform's back corner. */
export const PLANT_INSET = 0.4;
export const PLANT_TOP = 0.95;

/** The sign grows a little on big platforms so its name stays readable… */
export function signScale(platformLength: number) {
  return Math.min(1.35, Math.max(1, platformLength / 3.6));
}
/** …and moves in from the front-left corner as it grows, so the board
 *  never overhangs the platform. */
export function signInset(scale: number) {
  return 0.48 + 0.4 * (scale - 1);
}
export const SIGN_BOARD = { width: 0.92, height: 0.22, depth: 0.025, y: 0.34 };

/** Isometric screen axes (the camera looks along -1, -1, -1). */
export function isoX(x: number, _y: number, z: number) {
  return (x - z) / Math.SQRT2;
}
export function isoY(x: number, y: number, z: number) {
  return (-x + 2 * y - z) / Math.sqrt(6);
}
