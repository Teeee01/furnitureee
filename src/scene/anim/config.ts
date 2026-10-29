/*
 * Every number of the choreography lives here: spring configs, durations,
 * stagger and phase start times. Tweak motion in this file only.
 */

/** cubic-bezier(x1, y1, x2, y2) as an easing function (Newton + bisection). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      const d = slopeX(t);
      if (Math.abs(err) < 1e-5) return sampleY(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** cubic-bezier(.4, 0, 1, 1) — the exit ease-in. */
export const EASE_IN = cubicBezier(0.4, 0, 1, 1);
export const EASE_IN_OUT = cubicBezier(0.45, 0, 0.25, 1);

export const SPRING = {
  /** Morph: table / couch / platform / person / chairs that stay.
   *  ζ ≈ 0.69 → about 5–7% overshoot, settled by ~550 ms. */
  table: { tension: 210, friction: 20, mass: 1 },
  /** Camera zoom + target: overdamped, lags behind the table. */
  camera: { tension: 120, friction: 26, mass: 1 },
  /** Enter: chairs, props, pieces. */
  enter: { tension: 300, friction: 18, mass: 1 },
  /** Anticipation squash going in (fast, no wobble)… */
  squash: { tension: 620, friction: 34, mass: 1 },
  /** …and breathing back out. */
  squashRelease: { tension: 380, friction: 24, mass: 1 },
  /** Style puff going in. */
  puff: { tension: 500, friction: 22, mass: 1 },
  /** Mouse tilt + head turn. */
  soft: { tension: 60, friction: 20, mass: 1 },
} as const;

export const TWEEN = {
  /** Chair exit: scale 1 → 0, sink, turn. */
  exit: { duration: 220, easing: EASE_IN },
  /** Main piece leaving on a category change: sink 0.3 + scale to 0. */
  sink: { duration: 250, easing: EASE_IN },
  /** Swap: the old table shrinks to 25% and fades out. */
  swapOut: { duration: 300, easing: EASE_IN },
  swapFade: { duration: 150, easing: EASE_IN_OUT },
  colour: { duration: 400, easing: EASE_IN_OUT },
  style: { duration: 400, easing: EASE_IN_OUT },
  rug: { duration: 500, easing: EASE_IN_OUT },
  rugFade: { duration: 400, easing: EASE_IN_OUT },
  /** First load: the platform fades up. */
  introFade: { duration: 450, easing: EASE_IN_OUT },
  /** Reduced motion: every change becomes one 200 ms crossfade. */
  reduced: { duration: 200, easing: EASE_IN_OUT },
} as const;

/** Enter / exit amounts. */
export const MOVE = {
  exitSink: 0.15,
  exitTurn: 15,
  enterDrop: 0.25,
  enterTurn: 20,
  /** Spring overshoot on scale is compressed to land on 1.06 (chairs)… */
  enterScalePeak: 0.06,
  /** …and 1.08 (cushions). */
  cushionScalePeak: 0.08,
  cushionDrop: 0.3,
  categorySink: 0.3,
  squash: 0.88,
  squashDip: 0.025,
  swapShrink: 0.25,
  swapFrom: 0.6,
  puff: 1.05,
  /** First load: the platform grows from this scale as it fades up. */
  introPlatformFrom: 0.94,
} as const;

/** Raw overshoot of the enter spring (ζ ≈ 0.52 → ~15%). Used to map the
 *  spring's overshoot to the wanted peak. */
export const ENTER_RAW_OVERSHOOT = 0.148;

/** Phase start times (ms) and staggers. */
export const T = {
  exitStagger: 40,
  /** Exits are compressed so the last one starts by this time. */
  exitWindow: 210,
  squashIn: 80,
  squashOut: 180,
  morph: 150,
  /** Morph waits for removed couch cushions to shrink out. */
  morphAfterCushions: 210,
  camera: 150,
  enter: 300,
  enterStagger: 50,
  /** Enter staggers are compressed to keep long tables snappy. */
  enterWindow: 650,
  cushionStagger: 70,
  extrasStagger: 60,
  // Swap (different furniture type)
  swapIn: 300,
  laptopAfterSwap: 120,
  seatsAfterSwap: 420,
  // Category change
  categoryMainOut: 180,
  categoryMorph: 220,
  categoryMainIn: 440,
  categorySeats: 540,
  // Style change
  styleStagger: 30,
  puffRelease: 140,
  // Idle
  headTurnEvery: 4000,
  // First load: the main piece springs up after the platform has faded in
  introMain: 260,
  // Reduced motion: the scene swaps at the middle of the crossfade
  reducedSwap: 100,
} as const;

/** Spacing that keeps `count` staggered starts inside `window` ms. */
export function stagger(count: number, step: number, window: number) {
  if (count <= 1) return step;
  return Math.min(step, window / (count - 1));
}
