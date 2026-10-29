import { SpringValue, type SpringConfig } from "@react-spring/three";
import {
  ARMCHAIR,
  type Category,
  type CouchSpec,
  type CouchStyle,
  type PersonSpec,
  type RugSpec,
  type SeatSpec,
  type SizeOption,
  type TableSpec,
} from "../../data/furniture";
import { POSES } from "../props/poses";
import { SceneTheme } from "../sceneTheme";
import { THEMES, type ThemeName } from "../../theme";
import { isoX, isoY, PLANT_INSET, PLANT_TOP, SIGN_BOARD, signInset, signScale } from "../layout";
import { SEAT_HEIGHT } from "../../data/furniture";
import { ENTER_RAW_OVERSHOOT, MOVE, SPRING, stagger, T, TWEEN } from "./config";

/*
 * THE DIRECTOR — turns a selection into motion.
 *
 * The scene is a set of keyed items (tables, chairs, couches, props). Every
 * animated number of every item is a react-spring SpringValue. A selection
 * change diffs the new layout against the items on stage:
 *   - items in both layouts MORPH (springs retarget to the new numbers),
 *   - items no longer needed EXIT (staggered), then unmount,
 *   - new items ENTER (staggered).
 * Phases are started by timers. A new change clears pending timers and
 * re-plans from wherever every spring currently is: nothing queues, nothing
 * restarts, and an item mid-exit that is needed again reverses straight back.
 *
 * Components never get React state per frame: they read `.get()` in useFrame.
 */

type SV = SpringValue<number>;
type Cfg = SpringConfig;

export type LayoutChange = "init" | "size" | "category";

/** Scale / drop / turn / opacity shared by every item. */
export interface Presence {
  s: SV;
  dy: SV;
  spin: SV;
  op: SV;
}

export interface TableAnim extends Presence {
  length: SV;
  width: SV;
  radius: SV;
  thickness: SV;
  height: SV;
  x: SV;
  z: SV;
  rot: SV;
  squash: SV;
  dip: SV;
}

export interface CushionAnim {
  s: SV;
  dy: SV;
  leaving: boolean;
}

export interface CouchAnim extends Presence {
  /** seats × seatWidth: the stretchable part of the base. */
  inner: SV;
  seatWidth: SV;
  armWidth: SV;
  depth: SV;
  /** 0 = plain couch, 1 = L-sectional (corner + side module out). */
  sect: SV;
  sideLength: SV;
  x: SV;
  z: SV;
  rot: SV;
  squash: SV;
  /** Style weights (crossfade / morph between the three styles). */
  wModern: SV;
  wCurved: SV;
  wClassic: SV;
  puff: SV;
}

export interface PointAnim extends Presence {
  x: SV;
  z: SV;
  rot: SV;
  y: SV;
}

export interface RugAnim extends Presence {
  length: SV;
  width: SV;
  x: SV;
  z: SV;
  /** 0 = rolled up, 1 = flat. */
  unroll: SV;
}

interface Base {
  /** Stable identity (React key) — `key` can be reassigned by rematching. */
  id: number;
  key: string;
  /** Stagger order: lower = closer to the person / earlier. */
  order: number;
  /** Not in the current layout (will unmount when its exit finishes). */
  leaving: boolean;
  /** The exit motion has actually started (a re-plan can cancel a scheduled
   *  exit before it starts; such an item must be scheduled again). */
  exiting: boolean;
}

export interface TableItem extends Base {
  type: "table";
  family: string;
  spec: TableSpec;
  /** In living rooms tables are extra pieces (they pop, not swap). */
  extra: boolean;
  anim: TableAnim;
}
export interface SeatItem extends Base {
  type: "seat";
  spec: SeatSpec;
  anim: PointAnim;
}
export interface CouchItem extends Base {
  type: "couch";
  role: "main" | "extra";
  spec: CouchSpec;
  anim: CouchAnim;
  cushions: CushionAnim[];
}
export interface LaptopItem extends Base {
  type: "laptop";
  anim: PointAnim;
}
export interface LampItem extends Base {
  type: "lamp";
  anim: PointAnim;
}
export interface RugItem extends Base {
  type: "rug";
  anim: RugAnim;
}

export type Item = TableItem | SeatItem | CouchItem | LaptopItem | LampItem | RugItem;

export interface PersonAnim {
  /** Presence (first-load entrance only; the person never leaves). */
  s: SV;
  dy: SV;
  x: SV;
  z: SV;
  rot: SV;
  seatHeight: SV;
  hipZ: SV;
  lean: SV;
  upperArm: SV;
  forearm: SV;
}

export interface ColourAnim {
  r: SV;
  g: SV;
  b: SV;
}

/** Tween (or set) a colour spring to [r, g, b]. */
function setColour(c: ColourAnim, rgb: number[], config?: Cfg) {
  (["r", "g", "b"] as const).forEach((k, i) => {
    const to = rgb[i] ?? 0;
    if (config) c[k].start({ to, config });
    else c[k].set(to);
  });
}

export const MAX_CUSHIONS = 3;

let nextId = 1;

/** Signed distance from (px, pz) to a table's rounded-rectangle top. */
function sdTable(px: number, pz: number, t: TableSpec) {
  const r = (t.rotation * Math.PI) / 180;
  const dx = px - t.x;
  const dz = pz - t.z;
  const lx = dx * Math.cos(r) - dz * Math.sin(r);
  const lz = dx * Math.sin(r) + dz * Math.cos(r);
  const rad = Math.min(t.radius, t.length / 2, t.width / 2);
  const qx = Math.abs(lx) - (t.length / 2 - rad);
  const qz = Math.abs(lz) - (t.width / 2 - rad);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - rad;
}

/** Would a straight glide from a to b pass through any of these tables? */
function crossesTable(ax: number, az: number, bx: number, bz: number, tables: TableSpec[]) {
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    if (tables.some((tb) => sdTable(x, z, tb) < -0.08)) return true;
  }
  return false;
}

/* ───────────────────────────── Targets ───────────────────────────── */

type Entry =
  | { type: "table"; key: string; order: number; spec: TableSpec; extra: boolean }
  | { type: "seat"; key: string; order: number; spec: SeatSpec }
  | { type: "couch"; key: string; order: number; spec: CouchSpec; role: "main" | "extra" }
  | { type: "laptop"; key: string; order: number; x: number; z: number; rot: number; y: number }
  | { type: "lamp"; key: string; order: number; x: number; z: number }
  | { type: "rug"; key: string; order: number; spec: RugSpec };

export interface Target {
  categoryId: string;
  platform: { length: number; width: number };
  /** The set's extent on screen (isometric units): the camera frames it. */
  frame: Frame;
  person: PersonSpec;
  entries: Entry[];
}

/** Item keys decide what morphs: same key in both layouts = same piece. */
export function buildTarget(category: Category, size: SizeOption): Target {
  const c = category.id;
  const { setup } = size;
  const living = c === "living";
  const t = setup.table;
  const entries: Entry[] = [];

  entries.push({ type: "table", key: `${c}:table:${t.family}`, order: living ? 1 : 0, spec: t, extra: living });

  const kindCount: Record<string, number> = {};
  let armchairs = 0;
  setup.seats.forEach((s, i) => {
    if (s.kind === "armchair") {
      entries.push({
        type: "couch",
        key: `${c}:armchair#${armchairs++}`,
        order: 2 + i,
        role: "extra",
        spec: { ...ARMCHAIR, x: s.x, z: s.z, rotation: s.rotation },
      });
      return;
    }
    const n = (kindCount[s.kind] = (kindCount[s.kind] ?? -1) + 1);
    // Chairs of a different table family are different chairs: they never glide across.
    entries.push({ type: "seat", key: `${c}:${t.family}:${s.kind}#${n}`, order: i, spec: s });
  });
  if (setup.couch) entries.push({ type: "couch", key: `${c}:couch`, order: 0, role: "main", spec: setup.couch });
  if (setup.laptop) {
    const r = (t.rotation * Math.PI) / 180;
    const { x, z } = setup.laptop;
    entries.push({
      type: "laptop",
      key: `${c}:${t.family}:laptop`,
      order: 50,
      x: t.x + x * Math.cos(r) + z * Math.sin(r),
      z: t.z - x * Math.sin(r) + z * Math.cos(r),
      rot: setup.laptop.rotation + t.rotation,
      y: t.height,
    });
  }
  if (setup.lamp) entries.push({ type: "lamp", key: `${c}:lamp`, order: 40, ...setup.lamp });
  if (setup.rug) entries.push({ type: "rug", key: `${c}:rug`, order: 99, spec: setup.rug });

  return { categoryId: c, platform: setup.platform, frame: frameOf(setup, entries), person: setup.person, entries };
}

/* ───────────────────────────── Helpers ───────────────────────────── */

const sv = (v: number) => new SpringValue(v);

export interface Frame {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Footprint (width, depth) and top height of each seat kind. */
const SEAT_BOX: Record<SeatSpec["kind"], [number, number, number]> = {
  dining: [0.44, 0.44, 0.82],
  office: [0.6, 0.6, 1.0],
  woodChair: [0.42, 0.42, 0.86],
  barStool: [0.36, 0.36, SEAT_HEIGHT.barStool],
  bench: [1.4, 0.36, SEAT_HEIGHT.bench],
  armchair: [0.85, 0.8, 0.84],
};

/** Screen-space extent of everything in a setup: platform, furniture (as
 *  boxes), the person, the plant and the sign. */
function frameOf(setup: SizeOption["setup"], entries: Entry[]): Frame {
  const f: Frame = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const add = (x: number, y: number, z: number) => {
    const sx = isoX(x, y, z);
    const sy = isoY(x, y, z);
    f.minX = Math.min(f.minX, sx);
    f.maxX = Math.max(f.maxX, sx);
    f.minY = Math.min(f.minY, sy);
    f.maxY = Math.max(f.maxY, sy);
  };
  const box = (cx: number, cz: number, w: number, d: number, rot: number, y0: number, y1: number) => {
    const r = (rot * Math.PI) / 180;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const x = (a * w) / 2;
      const z = (b * d) / 2;
      const px = cx + x * Math.cos(r) + z * Math.sin(r);
      const pz = cz - x * Math.sin(r) + z * Math.cos(r);
      add(px, y0, pz);
      add(px, y1, pz);
    }
  };
  const { length: L, width: W } = setup.platform;
  // Rounded corners: the outermost point is ~0.29 r in from the square corner.
  const cut = Math.min(L, W) * 0.12 * 0.29;
  box(0, 0, L - 2 * cut, W - 2 * cut, 0, -0.25, 0);
  for (const e of entries) {
    if (e.type === "table") box(e.spec.x, e.spec.z, e.spec.length, e.spec.width, e.spec.rotation, 0, e.spec.height);
    if (e.type === "seat") {
      const [w, d, h] = SEAT_BOX[e.spec.kind];
      box(e.spec.x, e.spec.z, e.spec.kind === "bench" ? (e.spec.length ?? w) : w, d, e.spec.rotation, 0, e.spec.height ?? h);
    }
    if (e.type === "couch") {
      const c = e.spec;
      const len = c.seats * c.seatWidth + 2 * c.armWidth;
      box(c.x, c.z, len, c.depth, c.rotation, 0, 0.84);
      if (c.sideLength) {
        const r = (c.rotation * Math.PI) / 180;
        const lx = len / 2 - c.armWidth + c.depth / 2;
        const lz = c.sideLength / 2;
        box(c.x + lx * Math.cos(r) + lz * Math.sin(r), c.z - lx * Math.sin(r) + lz * Math.cos(r), c.depth, c.depth + c.sideLength, c.rotation, 0, 0.84);
      }
    }
    if (e.type === "laptop") box(e.x, e.z, 0.33, 0.25, e.rot, 0, e.y + 0.24);
    if (e.type === "lamp") box(e.x, e.z, 0.4, 0.4, 0, 0, 1.56);
  }
  const p = setup.person;
  box(p.x, p.z, 0.45, 0.45, p.rotation, 0, p.seatHeight + 0.86);
  box(-L / 2 + PLANT_INSET, -W / 2 + PLANT_INSET, 0.4, 0.4, 0, 0, PLANT_TOP);
  const sc = signScale(L);
  const si = signInset(sc);
  box(-L / 2 + si, W / 2 - si, SIGN_BOARD.width * sc, 0.06, 45, 0, (SIGN_BOARD.y + SIGN_BOARD.height / 2) * sc);
  return f;
}

function presence(visible: boolean): Presence {
  return { s: sv(visible ? 1 : 0), dy: sv(0), spin: sv(0), op: sv(1) };
}

/** Shortest-path angle target (degrees) from where `cur` is heading. */
function nearAngle(cur: number, to: number) {
  let d = (((to - cur) % 360) + 540) % 360 - 180;
  if (d === -180) d = 180;
  return cur + d;
}

/** The enter spring overshoots ~15%; displayed scale lands on 1 + peak. */
export function enterScale(raw: number, peak: number = MOVE.enterScalePeak) {
  return raw <= 1 ? raw : 1 + (raw - 1) * (peak / ENTER_RAW_OVERSHOOT);
}

const STYLE_KEYS: Record<CouchStyle, "wModern" | "wCurved" | "wClassic"> = {
  modern: "wModern",
  curved: "wCurved",
  classic: "wClassic",
};

/* ───────────────────────────── Director ───────────────────────────── */

export class Director {
  items = new Map<string, Item>();
  platform = {
    length: sv(3),
    width: sv(3),
    /** The camera's framing (screen extent), on the softer camera spring. */
    frame: { minX: sv(-2), maxX: sv(2), minY: sv(-1), maxY: sv(1) },
    /** Presence (first-load fade-in). */
    s: sv(1),
    op: sv(1),
  };
  /** The plant and the sign (first-load entrance only). */
  props = { plant: presence(true), sign: presence(true) };
  person: PersonAnim;
  tabletop: ColourAnim = { r: sv(1), g: sv(1), b: sv(1) };
  /** Living-room tables (white in both themes, tuned per theme). */
  neutralTop: ColourAnim = { r: sv(1), g: sv(1), b: sv(1) };
  /** Scene colours, lights and shadows of the current theme (springs). */
  theme: SceneTheme;
  fabric: ColourAnim = { r: sv(0.3), g: sv(0.3), b: sv(0.3) };
  style: CouchStyle = "modern";
  /** prefers-reduced-motion: every change is one 200 ms crossfade. */
  reduced = false;
  /** The element that dips for the reduced-motion crossfade. */
  dipEl: HTMLElement | null = null;
  /** Time of the last change (idle life waits until things settle). */
  lastChange = 0;
  /** Until when something may be moving (shadows re-render while busy). */
  busyUntil = 0;
  private introDone = false;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private immediate = false;
  private kind: LayoutChange = "init";
  private version = 0;
  private listeners = new Set<() => void>();

  constructor(target: Target, style: CouchStyle, tabletop: number[], fabric: number[], theme: ThemeName) {
    this.style = style;
    this.theme = new SceneTheme(theme);
    const p = target.person;
    const pose = POSES[p.pose];
    this.person = {
      s: sv(1),
      dy: sv(0),
      x: sv(p.x),
      z: sv(p.z),
      rot: sv(p.rotation),
      seatHeight: sv(p.seatHeight),
      hipZ: sv(pose.hipZ),
      lean: sv(pose.lean),
      upperArm: sv(pose.upperArm),
      forearm: sv(pose.forearm),
    };
    setColour(this.tabletop, tabletop);
    setColour(this.fabric, fabric);
    setColour(this.neutralTop, hexToRgb(THEMES[theme].scene.matteWhite));
    this.applyLayout(target, "init");
    this.hideAll();
  }

  /* — First load — */

  /** Everything starts hidden; `intro()` brings it in once the scene can
   *  draw (never a blank screen, never a pop). */
  private hideAll() {
    const hide = (a: Presence) => {
      a.s.set(0);
      a.dy.set(MOVE.enterDrop);
      a.spin.set(MOVE.enterTurn);
    };
    for (const item of this.items.values()) {
      hide(item.anim);
      if (item.type === "rug") item.anim.unroll.set(0);
    }
    hide(this.props.plant);
    hide(this.props.sign);
    this.person.s.set(0);
    this.person.dy.set(MOVE.enterDrop);
    this.platform.s.set(MOVE.introPlatformFrom);
    this.platform.op.set(0);
  }

  /** The first-load entrance: the platform fades up, then the main piece,
   *  the seating (person with their seat), then the props, with the ENTER
   *  rules. Reduced motion: one fade. */
  intro() {
    if (this.introDone) return;
    this.introDone = true;
    this.lastChange = performance.now();
    this.busyUntil = this.lastChange + 3000;
    const items = [...this.items.values()];
    const showAll = () => {
      for (const item of items) {
        item.anim.s.set(1);
        item.anim.dy.set(0);
        item.anim.spin.set(0);
        if (item.type === "rug") item.anim.unroll.set(1);
      }
      for (const a of [this.props.plant, this.props.sign]) {
        a.s.set(1);
        a.dy.set(0);
        a.spin.set(0);
      }
      this.person.s.set(1);
      this.person.dy.set(0);
      this.platform.s.set(1);
      this.platform.op.set(1);
    };
    if (this.reduced) {
      showAll();
      this.dipEl?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TWEEN.reduced.duration, easing: "ease-out" });
      return;
    }
    const isMain = (i: Item) => (i.type === "table" && !i.extra) || (i.type === "couch" && i.role === "main");
    this.platform.op.start({ to: 1, config: TWEEN.introFade });
    this.platform.s.start({ to: 1, config: SPRING.table });
    const mains = items.filter(isMain);
    const seats = items.filter((i) => i.type === "seat").sort((a, b) => a.order - b.order);
    const props = items.filter((i) => !isMain(i) && i.type !== "seat" && i.type !== "rug").sort((a, b) => a.order - b.order);
    const rugs = items.filter((i): i is RugItem => i.type === "rug");
    const step = stagger(seats.length, T.enterStagger, T.enterWindow);
    const seatsAt = T.introMain + 100;
    // Own timers: a change made during the entrance must not cancel it.
    const t = (ms: number, fn: () => void) => setTimeout(fn, ms);
    for (const r of rugs) t(T.introMain - 60, () => !r.leaving && this.enterRug(r, "roll"));
    const enter = (i: Item) => {
      if (!i.leaving) this.enter(i);
    };
    for (const m of mains) t(T.introMain, () => enter(m));
    seats.forEach((s, i) => t(seatsAt + i * step, () => enter(s)));
    // The person drops in with their seat (or just after the couch).
    const personAt = seats.length ? seatsAt + 60 : T.introMain + 120;
    t(personAt, () => {
      this.person.s.start({ to: 1, config: SPRING.enter });
      this.person.dy.start({ to: 0, config: SPRING.enter });
    });
    const propsAt = Math.max(personAt, seatsAt + seats.length * step) + T.extrasStagger;
    const all = [...props, this.props.plant, this.props.sign] as (Item | Presence)[];
    all.forEach((p, i) =>
      t(propsAt + i * T.extrasStagger, () => ("anim" in p ? enter(p) : this.enterPresence(p))),
    );
  }

  private enterPresence(a: Presence) {
    a.s.start({ to: 1, config: SPRING.enter });
    a.dy.start({ to: 0, config: SPRING.enter });
    a.spin.start({ to: 0, config: SPRING.enter });
  }

  /* — React subscription (only for items mounting / unmounting) — */

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;
  private notify() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  /* — Scheduling — */

  private at(ms: number, fn: () => void) {
    if (this.immediate || ms <= 0) fn();
    else this.timers.push(setTimeout(fn, ms));
  }
  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /** Retarget a spring (no-op if it is already heading there). */
  private go(v: SV, to: number, config: Cfg) {
    if (this.immediate) {
      v.set(to);
      return Promise.resolve();
    }
    if (Math.abs(v.goal - to) < 1e-6) return Promise.resolve();
    return v.start({ to, config: this.reduced ? TWEEN.reduced : config });
  }
  private goAngle(v: SV, to: number, config: Cfg) {
    return this.go(v, nearAngle(v.goal, to), config);
  }
  private goPos(a: { x: SV; z: SV; rot: SV }, x: number, z: number, rot: number, config: Cfg) {
    this.go(a.x, x, config);
    this.go(a.z, z, config);
    this.goAngle(a.rot, rot, config);
  }

  /* — Public API — */

  setReduced(reduced: boolean) {
    this.reduced = reduced;
  }

  /** Size or category change. */
  change(target: Target, kind: LayoutChange) {
    this.lastChange = performance.now();
    this.busyUntil = this.lastChange + 3000;
    if (!this.introDone) this.intro();
    if (this.reduced && kind !== "init") {
      // One crossfade: the canvas dips, the scene swaps at the midpoint.
      this.clearTimers();
      this.dipEl?.animate([{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], {
        duration: TWEEN.reduced.duration,
        easing: "ease-in-out",
      });
      this.timers.push(setTimeout(() => this.applyLayout(target, "init"), T.reducedSwap));
      return;
    }
    this.applyLayout(target, kind);
  }

  /** Finish swatch: colour tweens, nothing else moves. */
  setColours(tabletop: number[], fabric: number[], neutralTop: number[]) {
    const config = TWEEN.colour;
    setColour(this.tabletop, tabletop, config);
    setColour(this.fabric, fabric, config);
    setColour(this.neutralTop, neutralTop, config);
  }

  /** Theme switch: colours, lights and shadows tween (400 ms); nothing moves. */
  setTheme(name: ThemeName) {
    if (name !== this.theme.name) this.theme.set(name);
  }

  /** Style: every couch / armchair puffs and morphs, 30 ms apart. */
  setStyle(style: CouchStyle) {
    if (style === this.style) return;
    this.style = style;
    this.lastChange = performance.now();
    this.busyUntil = this.lastChange + 1500;
    const couches = [...this.items.values()]
      .filter((i): i is CouchItem => i.type === "couch" && !i.leaving)
      .sort((a, b) => (a.role === b.role ? a.order - b.order : a.role === "main" ? -1 : 1));
    couches.forEach((c, i) => {
      const start = () => {
        for (const s of ["modern", "curved", "classic"] as const) {
          this.go(c.anim[STYLE_KEYS[s]], s === style ? 1 : 0, TWEEN.style);
        }
        if (this.reduced) return;
        c.anim.puff.start({ to: MOVE.puff, config: SPRING.puff });
        setTimeout(() => c.anim.puff.start({ to: 1, config: SPRING.table }), T.puffRelease);
      };
      if (this.reduced || i === 0) start();
      else setTimeout(start, i * T.styleStagger);
    });
  }

  /* — The choreography — */

  private applyLayout(target: Target, kind: LayoutChange) {
    this.clearTimers();
    this.immediate = kind === "init";
    this.kind = kind;
    const category = kind === "category";
    const living = target.categoryId === "living";
    let added = false;

    if (!this.immediate) this.rematchSeats(target);
    const next = new Map(target.entries.map((e) => [e.key, e]));

    // A re-plan may have cancelled the second half of an anticipation squash:
    // breathe every piece back out first (the new plan may squash again).
    if (!this.immediate) {
      for (const item of this.items.values()) {
        if (item.type !== "table" && item.type !== "couch") continue;
        this.go(item.anim.squash, 1, SPRING.squashRelease);
        if (item.type === "table") this.go(item.anim.dip, 0, SPRING.squashRelease);
      }
    }

    // Swap: a different main table family in the same category.
    const prevMain = [...this.items.values()].find((i): i is TableItem => i.type === "table" && !i.extra && !i.leaving);
    const nextMain = target.entries.find((e) => e.type === "table" && !e.extra);
    const swap = !category && !living && !!prevMain && !!nextMain && prevMain.key !== nextMain.key;

    /* ── 1. EXIT ─────────────────────────────────────────────── */
    const leaving = [...this.items.values()].filter((i) => !next.has(i.key) && !i.exiting);
    // Main pieces on a category change sink after the seating.
    const isMain = (i: Item) => (i.type === "table" && !i.extra) || (i.type === "couch" && i.role === "main");
    const staggered = leaving
      .filter((i) => !(isMain(i) && (category || swap)) && i.type !== "rug")
      .sort((a, b) => {
        // Props and extra pieces first, then chairs from the far end inward.
        const pa = a.type === "seat" ? 0 : 1;
        const pb = b.type === "seat" ? 0 : 1;
        return pb - pa || b.order - a.order;
      });

    // Cushions that are no longer needed shrink out with the pieces.
    const couchPlans = new Map<CouchItem, { remove: number[]; add: number[] }>();
    for (const e of target.entries) {
      if (e.type !== "couch") continue;
      const item = this.items.get(e.key);
      if (item?.type !== "couch" || item.leaving) continue;
      const n = e.spec.seats;
      const remove: number[] = [];
      const add: number[] = [];
      item.cushions.forEach((c, i) => {
        if (i >= n && c.s.goal > 0) remove.push(i);
        if (i < n && (c.leaving || c.s.goal < 1)) add.push(i);
      });
      couchPlans.set(item, { remove: remove.reverse(), add });
    }
    const cushionExits = [...couchPlans.entries()].flatMap(([couch, p]) => p.remove.map((i) => ({ couch, i })));

    const exitCount = staggered.length + cushionExits.length;
    const exitStep = stagger(exitCount, T.exitStagger, T.exitWindow);
    let slot = 0;
    for (const item of staggered) {
      item.leaving = true;
      this.at(slot++ * exitStep, () => this.exit(item, "chair"));
    }
    for (const { couch, i } of cushionExits) {
      const c = couch.cushions[i]!;
      c.leaving = true;
      this.at(slot++ * exitStep, () => {
        this.go(c.s, 0, TWEEN.exit);
        this.go(c.dy, -MOVE.exitSink * 0.5, TWEEN.exit);
      });
    }
    for (const item of leaving) {
      if (item.type === "rug") {
        item.leaving = true;
        this.exit(item, category ? "fade" : "roll");
      } else if (isMain(item) && category) {
        item.leaving = true;
        this.at(T.categoryMainOut, () => this.exit(item, "sink"));
      } else if (isMain(item) && swap) {
        item.leaving = true;
        this.exit(item, "swap");
      }
    }

    /* ── 2. MORPH (items in both layouts, the person, the platform) ── */
    const morphAt = category ? T.categoryMorph : cushionExits.length ? T.morphAfterCushions : T.morph;
    const revived: Item[] = [];
    const entering: Item[] = [];

    for (const e of target.entries) {
      let item = this.items.get(e.key);
      if (item && item.leaving) {
        // Mid-exit and needed again: reverse straight back.
        item.leaving = false;
        revived.push(item);
      } else if (!item) {
        item = this.create(e, swap && e.type === "table" && !e.extra);
        this.items.set(e.key, item);
        added = true;
        entering.push(item);
        continue;
      } else if (
        item.anim.s.goal < 1 ||
        (item.type === "rug" && (item.anim.unroll.goal < 1 || item.anim.op.goal < 1))
      ) {
        // Scheduled to enter by an earlier change that never got there.
        entering.push(item);
      }
      this.morph(item, e, morphAt, kind === "size" && !living);
    }
    for (const item of revived) this.revive(item);

    // Person + platform + camera.
    const p = target.person;
    const pose = POSES[p.pose];
    this.at(morphAt, () => {
      const a = this.person;
      this.goPos(a, p.x, p.z, p.rotation, SPRING.table);
      this.go(a.seatHeight, p.seatHeight, SPRING.table);
      this.go(a.hipZ, pose.hipZ, SPRING.table);
      this.go(a.lean, pose.lean, SPRING.table);
      this.go(a.upperArm, pose.upperArm, SPRING.table);
      this.go(a.forearm, pose.forearm, SPRING.table);
      this.go(this.platform.length, target.platform.length, SPRING.table);
      this.go(this.platform.width, target.platform.width, SPRING.table);
    });
    this.at(category ? T.categoryMorph : T.camera, () => {
      const f = this.platform.frame;
      this.go(f.minX, target.frame.minX, SPRING.camera);
      this.go(f.maxX, target.frame.maxX, SPRING.camera);
      this.go(f.minY, target.frame.minY, SPRING.camera);
      this.go(f.maxY, target.frame.maxY, SPRING.camera);
    });

    /* ── 3. ENTER ───────────────────────────────────────────── */
    const enterSeats = entering.filter((i) => i.type === "seat").sort((a, b) => a.order - b.order);
    const enterMains = entering.filter(isMain);
    const enterProps = entering
      .filter((i) => i.type !== "seat" && i.type !== "rug" && !isMain(i))
      .sort((a, b) => a.order - b.order);
    const enterRugs = entering.filter((i): i is RugItem => i.type === "rug");
    const seatStep = stagger(enterSeats.length, T.enterStagger, T.enterWindow);

    if (category) {
      for (const m of enterMains) this.at(T.categoryMainIn, () => this.enter(m));
      enterSeats.forEach((s, i) => this.at(T.categorySeats + i * seatStep, () => this.enter(s)));
      const propsAt = T.categorySeats + enterSeats.length * seatStep;
      enterProps.forEach((s, i) => this.at(propsAt + i * T.extrasStagger, () => this.enter(s)));
      for (const r of enterRugs) this.at(T.categoryMainIn, () => this.enterRug(r, "fade"));
    } else if (swap) {
      for (const m of enterMains) this.at(T.swapIn, () => this.swapIn(m as TableItem));
      enterProps.forEach((s, i) => this.at(T.swapIn + T.laptopAfterSwap + i * T.extrasStagger, () => this.enter(s)));
      enterSeats.forEach((s, i) => this.at(T.seatsAfterSwap + i * seatStep, () => this.enter(s)));
    } else {
      // Size change. Living: cushions drop in from the centre, then extras.
      let extrasAt: number = T.enter;
      for (const [couch, plan] of couchPlans) {
        const n = (target.entries.find((e) => e.key === couch.key) as { spec: CouchSpec }).spec.seats;
        const centre = (n - 1) / 2;
        const order = [...plan.add].sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
        order.forEach((i, k) => this.at(T.enter + k * T.cushionStagger, () => this.enterCushion(couch.cushions[i]!)));
        extrasAt = Math.max(extrasAt, T.enter + order.length * T.cushionStagger);
      }
      for (const m of enterMains) this.at(T.enter, () => this.enter(m));
      enterSeats.forEach((s, i) => this.at(T.enter + i * seatStep, () => this.enter(s)));
      const propsAt = living ? extrasAt : T.enter + enterSeats.length * seatStep;
      enterProps.forEach((s, i) => this.at(propsAt + i * T.extrasStagger, () => this.enter(s)));
      for (const r of enterRugs) this.at(living ? extrasAt : T.enter, () => this.enterRug(r, "roll"));
    }

    this.immediate = false;
    if (added) this.notify();
  }

  /**
   * Chairs that stay between two layouts pair with the NEAREST new seat (the
   * person's chair first), not by list position, so no chair glides through
   * the table or across the room. Unpaired chairs get a fresh key and leave.
   */
  private rematchSeats(target: Target) {
    const group = (key: string) => key.replace(/#[^#]*$/, "");
    const groups = new Map<string, Extract<Entry, { type: "seat" }>[]>();
    for (const e of target.entries) {
      if (e.type !== "seat") continue;
      const g = group(e.key);
      groups.set(g, [...(groups.get(g) ?? []), e]);
    }
    // The tables as they stand now (a chair at the end of a table that is
    // growing glides outward with it, so only the current top is an obstacle).
    const tables: TableSpec[] = [];
    for (const i of this.items.values()) {
      if (i.type !== "table" || i.leaving) continue;
      const a = i.anim;
      tables.push({ ...i.spec, length: a.length.goal, width: a.width.goal, radius: a.radius.goal, x: a.x.goal, z: a.z.goal, rotation: a.rot.goal });
    }
    let changed = false;
    for (const [g, entries] of groups) {
      const items = [...this.items.values()].filter(
        // Chairs mid-exit are candidates too: if one is paired again it
        // reverses straight back; otherwise it keeps leaving under a new key.
        (i): i is SeatItem => i.type === "seat" && group(i.key) === g,
      );
      if (!items.length) continue;
      const goalPos = (i: SeatItem) => [i.anim.x.goal, i.anim.z.goal] as const;
      // Where the chair is right now (it may be mid-glide).
      const pos = (i: SeatItem) => [i.anim.x.get(), i.anim.z.get()] as const;
      const free = new Set(items);
      const assigned = new Map<SeatItem, string>();
      const take = (e: (typeof entries)[number], i: SeatItem) => {
        free.delete(i);
        assigned.set(i, e.key);
      };
      // The person's seat keeps the chair they are sitting on.
      const personSeat = entries.find((e) => e.order === 0);
      const rest = entries.filter((e) => e !== personSeat);
      if (personSeat) {
        const px = this.person.x.goal;
        const pz = this.person.z.goal;
        let best: SeatItem | null = null;
        let bd = 0.05;
        for (const i of free) {
          const [x, z] = goalPos(i);
          const d = Math.hypot(x - px, z - pz);
          if (d < bd) [best, bd] = [i, d];
        }
        if (best) take(personSeat, best);
        else rest.unshift(personSeat);
      }
      // Greedy nearest pairs for the rest; a glide that would cross a table
      // is not allowed (that chair leaves and a new one enters instead).
      const pairs: { e: (typeof entries)[number]; i: SeatItem; d: number }[] = [];
      for (const e of rest) for (const i of free) {
        const [x, z] = pos(i);
        if (crossesTable(x, z, e.spec.x, e.spec.z, tables)) continue;
        pairs.push({ e, i, d: Math.hypot(x - e.spec.x, z - e.spec.z) });
      }
      pairs.sort((a, b) => a.d - b.d);
      const done = new Set<unknown>();
      for (const p of pairs) {
        if (done.has(p.e) || !free.has(p.i)) continue;
        done.add(p.e);
        take(p.e, p.i);
      }
      for (const i of items) {
        const key = assigned.get(i) ?? `${g}#gone-${i.id}`;
        if (key !== i.key) {
          i.key = key;
          changed = true;
        }
      }
    }
    if (changed) this.items = new Map([...this.items.values()].map((i) => [i.key, i]));
  }

  /* — Item factories and per-item motions — */

  private create(e: Entry, swapTable: boolean): Item {
    const hidden = this.immediate ? presence(true) : presence(false);
    if (!this.immediate) {
      hidden.dy.set(MOVE.enterDrop);
      hidden.spin.set(MOVE.enterTurn);
    }
    const base = { id: nextId++, key: e.key, order: e.order, leaving: false, exiting: false };
    switch (e.type) {
      case "table": {
        const t = e.spec;
        if (swapTable) {
          hidden.dy.set(0);
          hidden.spin.set(0);
          hidden.op.set(0);
        }
        return {
          ...base,
          type: "table",
          family: t.family,
          spec: t,
          extra: e.extra,
          anim: {
            ...hidden,
            length: sv(t.length),
            width: sv(t.width),
            radius: sv(t.radius),
            thickness: sv(t.thickness),
            height: sv(t.height),
            x: sv(t.x),
            z: sv(t.z),
            rot: sv(t.rotation),
            squash: sv(1),
            dip: sv(0),
          },
        };
      }
      case "seat":
        return {
          ...base,
          type: "seat",
          spec: e.spec,
          anim: { ...hidden, x: sv(e.spec.x), z: sv(e.spec.z), rot: sv(e.spec.rotation), y: sv(0) },
        };
      case "couch": {
        const c = e.spec;
        const w = (s: CouchStyle) => sv(this.style === s ? 1 : 0);
        return {
          ...base,
          type: "couch",
          role: e.role,
          spec: c,
          anim: {
            ...hidden,
            inner: sv(c.seats * c.seatWidth),
            seatWidth: sv(c.seatWidth),
            armWidth: sv(c.armWidth),
            depth: sv(c.depth),
            sect: sv(c.sideLength ? 1 : 0),
            sideLength: sv(c.sideLength ?? 1),
            x: sv(c.x),
            z: sv(c.z),
            rot: sv(c.rotation),
            squash: sv(1),
            wModern: w("modern"),
            wCurved: w("curved"),
            wClassic: w("classic"),
            puff: sv(1),
          },
          cushions: Array.from({ length: MAX_CUSHIONS }, (_, i) => ({
            s: sv(i < c.seats ? 1 : 0),
            dy: sv(0),
            leaving: false,
          })),
        };
      }
      case "laptop":
        return { ...base, type: "laptop", anim: { ...hidden, x: sv(e.x), z: sv(e.z), rot: sv(e.rot), y: sv(e.y) } };
      case "lamp":
        return { ...base, type: "lamp", anim: { ...hidden, x: sv(e.x), z: sv(e.z), rot: sv(0), y: sv(0) } };
      case "rug": {
        const r = e.spec;
        const a = { ...presence(true), length: sv(r.length), width: sv(r.width), x: sv(r.x), z: sv(r.z), unroll: sv(1) };
        // Size change: rolled up, waiting to unroll. Category change: flat, faded out.
        if (!this.immediate && this.kind === "category") a.op.set(0);
        else if (!this.immediate) a.unroll.set(0);
        return { ...base, type: "rug", anim: a };
      }
    }
  }

  /** Items in both layouts glide / morph to their new numbers. */
  private morph(item: Item, e: Entry, at: number, anticipate: boolean) {
    const cfg = SPRING.table;
    switch (item.type) {
      case "table": {
        if (e.type !== "table") return;
        const a = item.anim;
        const t = e.spec;
        item.spec = t;
        // Anticipation: squash and dip, unless the table is already moving
        // (rapid clicks shouldn't make it hiccup).
        if (anticipate && !this.immediate && !this.reduced && !a.length.isAnimating && !a.width.isAnimating) {
          this.at(T.squashIn, () => {
            this.go(a.squash, MOVE.squash, SPRING.squash);
            this.go(a.dip, -MOVE.squashDip, SPRING.squash);
          });
          this.at(T.squashOut, () => {
            this.go(a.squash, 1, SPRING.squashRelease);
            this.go(a.dip, 0, SPRING.squashRelease);
          });
        }
        this.at(at, () => {
          this.go(a.length, t.length, cfg);
          this.go(a.width, t.width, cfg);
          this.go(a.radius, t.radius, cfg);
          this.go(a.thickness, t.thickness, cfg);
          this.go(a.height, t.height, cfg);
          this.goPos(a, t.x, t.z, t.rotation, cfg);
        });
        return;
      }
      case "seat":
        if (e.type !== "seat") return;
        item.spec = e.spec;
        this.at(at, () => this.goPos(item.anim, e.spec.x, e.spec.z, e.spec.rotation, cfg));
        return;
      case "couch": {
        if (e.type !== "couch") return;
        const a = item.anim;
        const c = e.spec;
        const grows = c.seats * c.seatWidth !== item.spec.seats * item.spec.seatWidth || !!c.sideLength !== !!item.spec.sideLength;
        item.spec = c;
        if (grows && !this.immediate && !this.reduced && !a.inner.isAnimating) {
          this.at(T.squashIn, () => this.go(a.squash, 0.94, SPRING.squash));
          this.at(T.squashOut, () => this.go(a.squash, 1, SPRING.squashRelease));
        }
        this.at(at, () => {
          this.go(a.inner, c.seats * c.seatWidth, cfg);
          this.go(a.seatWidth, c.seatWidth, cfg);
          this.go(a.armWidth, c.armWidth, cfg);
          this.go(a.depth, c.depth, cfg);
          this.go(a.sect, c.sideLength ? 1 : 0, cfg);
          if (c.sideLength) this.go(a.sideLength, c.sideLength, cfg);
          this.goPos(a, c.x, c.z, c.rotation, cfg);
        });
        return;
      }
      case "laptop":
        if (e.type !== "laptop") return;
        this.at(at, () => {
          this.goPos(item.anim, e.x, e.z, e.rot, cfg);
          this.go(item.anim.y, e.y, cfg);
        });
        return;
      case "lamp":
        if (e.type !== "lamp") return;
        this.at(at, () => this.goPos(item.anim, e.x, e.z, 0, cfg));
        return;
      case "rug": {
        if (e.type !== "rug") return;
        const a = item.anim;
        this.at(at, () => {
          this.go(a.length, e.spec.length, cfg);
          this.go(a.width, e.spec.width, cfg);
          this.go(a.x, e.spec.x, cfg);
          this.go(a.z, e.spec.z, cfg);
        });
        return;
      }
    }
  }

  /** ENTER: scale 0 → 1.06 → 1, drop from 0.25 above, turn from 20°. */
  private enter(item: Item) {
    const a = item.anim;
    if (this.immediate) {
      a.s.set(1);
      a.dy.set(0);
      a.spin.set(0);
      a.op.set(1);
      return;
    }
    if (a.s.goal < 0.5 && a.s.get() < 0.02) {
      a.dy.set(MOVE.enterDrop);
      a.spin.set(MOVE.enterTurn);
    }
    this.go(a.s, 1, SPRING.enter);
    this.go(a.dy, 0, SPRING.enter);
    this.go(a.spin, 0, SPRING.enter);
    this.go(a.op, 1, SPRING.enter);
  }

  /** Reverse straight back from wherever an exit got to. */
  private revive(item: Item) {
    item.exiting = false;
    const a = item.anim;
    this.go(a.s, 1, SPRING.enter);
    this.go(a.dy, 0, SPRING.enter);
    this.go(a.spin, 0, SPRING.enter);
    this.go(a.op, 1, TWEEN.swapFade);
    if (item.type === "rug") this.go(item.anim.unroll, 1, TWEEN.rug);
  }

  /** Swap-in: the new table springs from 0.6 → 1 (with overshoot) and fades in. */
  private swapIn(item: TableItem) {
    const a = item.anim;
    if (a.s.get() < MOVE.swapFrom) a.s.set(MOVE.swapFrom);
    this.go(a.s, 1, SPRING.table);
    this.go(a.op, 1, TWEEN.swapFade);
    this.go(a.dy, 0, SPRING.table);
  }

  private enterCushion(c: CushionAnim) {
    c.leaving = false;
    if (this.immediate) {
      c.s.set(1);
      c.dy.set(0);
      return;
    }
    if (c.s.get() < 0.02) c.dy.set(MOVE.cushionDrop);
    this.go(c.s, 1, SPRING.enter);
    this.go(c.dy, 0, SPRING.enter);
  }

  private enterRug(r: RugItem, how: "roll" | "fade") {
    const a = r.anim;
    if (how === "fade") {
      if (a.op.get() < 0.02) a.unroll.set(1);
      this.go(a.unroll, 1, TWEEN.rug);
      this.go(a.op, 1, TWEEN.rugFade);
    } else {
      a.op.set(1);
      this.go(a.unroll, 1, TWEEN.rug);
    }
  }

  private exit(item: Item, how: "chair" | "sink" | "swap" | "roll" | "fade") {
    if (!item.leaving) return;
    item.exiting = true;
    if (this.immediate) {
      this.remove(item);
      return;
    }
    const a = item.anim;
    let done: Promise<unknown>;
    if (how === "chair") {
      done = this.go(a.s, 0, TWEEN.exit);
      this.go(a.dy, -MOVE.exitSink, TWEEN.exit);
      this.go(a.spin, MOVE.exitTurn, TWEEN.exit);
    } else if (how === "sink") {
      done = this.go(a.s, 0, TWEEN.sink);
      this.go(a.dy, -MOVE.categorySink, TWEEN.sink);
    } else if (how === "swap") {
      this.go(a.s, MOVE.swapShrink, TWEEN.swapOut);
      done = this.go(a.op, 0, TWEEN.swapOut);
    } else if (how === "roll" && item.type === "rug") {
      done = this.go(item.anim.unroll, 0, TWEEN.rug);
    } else {
      done = this.go(a.op, 0, TWEEN.rugFade);
    }
    done.then(() => {
      if (item.leaving && this.items.get(item.key) === item) this.remove(item);
    });
  }

  private remove(item: Item) {
    this.items.delete(item.key);
    this.notify();
  }
}

/** "#rrggbb" → linear-ish [r, g, b] 0–1 (sRGB components; the material
 *  converts). */
export function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
