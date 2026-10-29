import type { PersonPose } from "../../data/furniture";

/** Sitting poses. All numbers are springs in the director, so the person
 *  blends from upright (at a table) to lounging (on a couch). Angles in °. */
export const POSES: Record<PersonPose, { hipZ: number; lean: number; upperArm: number; forearm: number }> = {
  // Sitting up at a table: hips near the back of the seat, slight lean.
  upright: { hipZ: -0.06, lean: 4, upperArm: -28, forearm: 6 },
  // Sinking into a couch, leaning back, hands on the lap.
  lounge: { hipZ: -0.14, lean: 17, upperArm: -10, forearm: 22 },
};
