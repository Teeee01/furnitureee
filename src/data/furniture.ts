/**
 * FORMA — every product, size, dimension, price, caption and seat position.
 *
 * Edit this file to change what the configurator offers. The 3D scene is a
 * pure function of the `Setup` objects below: nothing about a layout is
 * hard-coded in the scene components.
 *
 * Units and axes (3D):
 *   - 1 unit = 1 metre. The platform's top surface is y = 0.
 *   - x runs along a table's long axis, z across it. The camera looks from
 *     +x / +z, so -x / -z is the "back" of the room.
 *   - `rotation` is in degrees around the vertical axis. 0 = the piece faces
 *     +z (a chair at rotation 0 has its back at -z and its sitter faces +z).
 *
 * Seats are listed in the order they appear: the person's seat first, then
 * outward from it, alternating sides (the enter animation follows this order).
 *
 * ─── HOW TO CHANGE THINGS (everything is in the CATEGORIES list below) ───
 *
 *  Names        `name` of a size = the model field + the floating sign.
 *               `label` = the text on the size button. A category's
 *               `heading` is the panel title.
 *
 *  Prices       `price` in naira, a plain number (850000 → "₦850,000").
 *               The currency symbol is CURRENCY.
 *
 *  Captions     `caption` under the scene. Keep it in step with the table
 *               size (e.g. "Seats 6 · 180 × 95 cm"); the cart shows the part
 *               after "·" as the dimensions. `seats` = people it seats.
 *
 *  Dimensions   in metres, in `table({ … })`:
 *                 length / width   180 × 95 cm → length: 1.8, width: 0.95
 *                 radius           corner radius. Round: length = width and
 *                                  radius = width / 2. Pill: radius =
 *                                  width / 2. Rectangle: small (0.04).
 *                 height           top surface above the floor (0.75 dining)
 *                 thickness        top thickness
 *                 family           same family → the table STRETCHES between
 *                                  sizes; a different family is swapped.
 *               Couches: seats, seatWidth, armWidth, depth (the length is
 *               seats × seatWidth + 2 × armWidth); sideLength makes an L.
 *               Give `platform` ~0.5 m of room around the furniture; the
 *               camera frames whatever you set automatically.
 *
 *  Seats        Helpers place chairs for you and turn them to the table:
 *                 ring(kind, count, distanceFromCentre)   round tables
 *                 around(kind, { headX, footX, sideXs, sideZ, straight })
 *                   headX / footX  chair at each end (x = ∓headX)
 *                   sideXs         x of each pair of side chairs
 *                   sideZ          how far out the side chairs sit
 *                   straight       half the length of the straight sides
 *               Or write them by hand: { kind, x, z, rotation }, e.g.
 *                 { kind: "dining", x: -1.2, z: 0, rotation: 90 }
 *               (rotation 90 faces +x; `facing(x, z, tx, tz)` computes it).
 *               Kinds: dining, office, woodChair, barStool (+ height),
 *               bench (+ length), armchair (living rooms).
 *
 *  The person   sits on `person`. personOn(seat) seats them on a chair;
 *               personOnCouch(couch, i) on cushion i of a couch.
 *
 * After editing, run `npm run build` (type-checks this file).
 */

/* ───────────────────────────── Types ───────────────────────────── */

export type CategoryId = "dining" | "office" | "kitchen" | "living";

export type CouchStyle = "modern" | "curved" | "classic";

/** Pedestal = dark central base (round / pill tables). Legs = 4 thin legs.
 *  Cabinet = a solid island base. */
export type TableBase = "pedestal" | "legs" | "cabinet";

/** ONE extruded rounded rectangle. Round: length = width, radius = width / 2.
 *  Pill: radius = width / 2. Desk / kitchen: a small radius. */
export interface TableSpec {
  length: number;
  width: number;
  radius: number;
  thickness: number;
  /** Height of the top surface above the floor. */
  height: number;
  base: TableBase;
  /** Tables of the same family MORPH into each other when the size changes
   *  (round → pill → long pill). A different family is different furniture:
   *  the old one shrinks away and the new one springs in. */
  family: string;
  x: number;
  z: number;
  rotation: number;
}

export type SeatKind = "dining" | "office" | "woodChair" | "barStool" | "bench" | "armchair";

export interface SeatSpec {
  kind: SeatKind;
  x: number;
  z: number;
  rotation: number;
  /** Bench length (bench only). */
  length?: number;
  /** Seat height (bar stools). */
  height?: number;
}

/** A couch built from modules: base, seat + back cushion per seat, two arms,
 *  legs. `length` of the base = seats × seatWidth + 2 × armWidth.
 *  `sideLength` turns it into an L-sectional: a corner module replaces the
 *  right arm and a side module extends toward +z from it. */
export interface CouchSpec {
  seats: number;
  seatWidth: number;
  armWidth: number;
  depth: number;
  x: number;
  z: number;
  rotation: number;
  sideLength?: number;
}

export type PersonPose = "upright" | "lounge";

export interface PersonSpec {
  /** The point on the seat surface the person sits on. */
  x: number;
  z: number;
  rotation: number;
  seatHeight: number;
  pose: PersonPose;
}

export interface RugSpec {
  length: number;
  width: number;
  x: number;
  z: number;
}

export interface Setup {
  /** The floating slab. Plant and sign sit on its corners. */
  platform: { length: number; width: number };
  table: TableSpec;
  seats: SeatSpec[];
  couch?: CouchSpec;
  person: PersonSpec;
  laptop?: { x: number; z: number; rotation: number };
  lamp?: { x: number; z: number };
  rug?: RugSpec;
}

export interface SizeOption {
  id: string;
  /** Text on the size button. */
  label: string;
  /** Product name: panel field + the floating sign. */
  name: string;
  /** Price in naira. */
  price: number;
  /** Caption under the scene. The part after "·" is shown as the
   *  dimensions in the cart. */
  caption: string;
  /** How many people the set seats (shown in the cart). */
  seats: number;
  setup: Setup;
}

export interface Finish {
  id: string;
  label: string;
  color: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  heading: string;
  /** What the finish swatches recolour. */
  finishTarget: "tabletop" | "fabric";
  finishes: Finish[];
  defaultFinish: string;
  sizes: [SizeOption, SizeOption, SizeOption, SizeOption];
}

/* ─────────────────────────── Constants ─────────────────────────── */

export const CURRENCY = "₦";

/** Tabletop colour wherever the finish row recolours something else. */
export const DEFAULT_TABLETOP = "#E8E8EC";

export const WOOD_FINISHES: Finish[] = [
  { id: "oak", label: "Oak", color: "#C69C6D" },
  { id: "walnut", label: "Walnut", color: "#6E4B33" },
  { id: "white", label: "Matte White", color: "#E8E8EC" },
];

export const FABRIC_FINISHES: Finish[] = [
  { id: "charcoal", label: "Charcoal Bouclé", color: "#56565E" },
  { id: "sand", label: "Sand Linen", color: "#CBBFA9" },
  { id: "olive", label: "Olive Velvet", color: "#5E6B3C" },
];

export const COUCH_STYLES: { id: CouchStyle; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "curved", label: "Curved" },
  { id: "classic", label: "Classic" },
];

/** Seat surface height per seat kind (bar stools take `height`). */
export const SEAT_HEIGHT: Record<SeatKind, number> = {
  dining: 0.46,
  office: 0.48,
  woodChair: 0.46,
  barStool: 0.75,
  bench: 0.45,
  armchair: 0.42,
};

/** Couch seat height (cushion top). */
export const COUCH_SEAT_HEIGHT = 0.42;
/** Depth of the back cushions; the seat cushion fills the rest. */
export const COUCH_BACK_DEPTH = 0.2;

/** The single armchair used in living-room sets (a 1-seat couch). */
export const ARMCHAIR = { seats: 1, seatWidth: 0.61, armWidth: 0.12, depth: 0.8 } as const;

/* ──────────────────────────── Helpers ──────────────────────────── */

const toDeg = (rad: number) => (rad * 180) / Math.PI;
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Rotation that makes a piece at (x, z) face (tx, tz). */
export function facing(x: number, z: number, tx: number, tz: number) {
  return round(toDeg(Math.atan2(tx - x, tz - z)));
}

/** A chair facing a table centred at the origin. `straight` is half the
 *  length of the table's straight sides: side chairs face straight across,
 *  end chairs face along the table. */
function seat(kind: SeatKind, x: number, z: number, straight = 0, extra: Partial<SeatSpec> = {}): SeatSpec {
  const tx = Math.max(-straight, Math.min(straight, x));
  return { kind, x, z, rotation: facing(x, z, tx, 0), ...extra };
}

/** `n` chairs evenly around a round table, the first at -x (the head). */
function ring(kind: SeatKind, n: number, radius: number): SeatSpec[] {
  const angles = Array.from({ length: n }, (_, i) => Math.PI + (i * 2 * Math.PI) / n);
  return headFirst(
    angles.map((a) => seat(kind, round(radius * Math.cos(a)), round(radius * Math.sin(a)))),
  );
}

/** Chairs around a pill / rectangle: a head chair at -headX, pairs of side
 *  chairs at each of `sideXs` (z = ±sideZ), a foot chair at +headX. */
function around(
  kind: SeatKind,
  opts: { headX?: number; footX?: number; sideXs: number[]; sideZ: number; straight: number },
): SeatSpec[] {
  const list: SeatSpec[] = [];
  if (opts.headX !== undefined) list.push(seat(kind, -opts.headX, 0, opts.straight));
  for (const x of [...opts.sideXs].sort((a, b) => a - b)) {
    list.push(seat(kind, x, opts.sideZ, opts.straight));
    list.push(seat(kind, x, -opts.sideZ, opts.straight));
  }
  if (opts.footX !== undefined) list.push(seat(kind, opts.footX, 0, opts.straight));
  return list;
}

/** Keeps the first seat (the head), then orders the rest by distance from it,
 *  so seats fill outward from the person alternating sides. */
function headFirst(list: SeatSpec[]): SeatSpec[] {
  const [head, ...rest] = list;
  if (!head) return list;
  const d = (s: SeatSpec) => Math.hypot(s.x - head.x, s.z - head.z);
  return [head, ...rest.sort((a, b) => d(a) - d(b) || b.z - a.z)];
}

/** The person sitting on a chair / stool / bench seat. */
function personOn(s: SeatSpec): PersonSpec {
  return {
    x: s.x,
    z: s.z,
    rotation: s.rotation,
    seatHeight: s.height ?? SEAT_HEIGHT[s.kind],
    pose: s.kind === "armchair" ? "lounge" : "upright",
  };
}

/** The person sitting on seat `index` of a couch (or on an armchair seat). */
function personOnCouch(c: Pick<CouchSpec, "seats" | "seatWidth" | "armWidth" | "depth" | "x" | "z" | "rotation">, index = 0): PersonSpec {
  const length = c.seats * c.seatWidth + 2 * c.armWidth;
  const lx = -length / 2 + c.armWidth + c.seatWidth * (index + 0.5);
  const lz = COUCH_BACK_DEPTH / 2; // centre of the seat cushion
  const r = (c.rotation * Math.PI) / 180;
  return {
    x: round(c.x + lx * Math.cos(r) + lz * Math.sin(r)),
    z: round(c.z - lx * Math.sin(r) + lz * Math.cos(r)),
    rotation: c.rotation,
    seatHeight: COUCH_SEAT_HEIGHT,
    pose: "lounge",
  };
}

function armchair(x: number, z: number, rotation: number): SeatSpec {
  return { kind: "armchair", x, z, rotation };
}

const table = (t: Partial<TableSpec> & Pick<TableSpec, "length" | "width" | "radius">): TableSpec => ({
  thickness: 0.045,
  height: 0.75,
  base: "pedestal",
  family: "round",
  x: 0,
  z: 0,
  rotation: 0,
  ...t,
});

/* ──────────────────────────── Dining ───────────────────────────── */

const dining2Seats = ring("dining", 2, 0.72);
const dining4Seats = ring("dining", 4, 0.92);
const dining6Seats = headFirst(
  around("dining", { headX: 1.27, footX: 1.27, sideXs: [-0.42, 0.42], sideZ: 0.76, straight: 0.42 }),
);
const dining10Seats = headFirst(
  around("dining", { headX: 1.88, footX: 1.88, sideXs: [-0.96, -0.32, 0.32, 0.96], sideZ: 0.8, straight: 0.97 }),
);

/* ──────────────────────────── Office ───────────────────────────── */

const officeSoloSeats: SeatSpec[] = [{ kind: "office", x: 0.05, z: -0.64, rotation: 0 }];
const office4Seats = ring("office", 4, 1.0);
const office10Seats = headFirst(
  around("office", { headX: 1.95, footX: 1.95, sideXs: [-0.96, -0.32, 0.32, 0.96], sideZ: 0.92, straight: 0.9 }),
);
const office14Seats = headFirst(
  around("office", {
    headX: 2.55,
    footX: 2.55,
    sideXs: [-1.6, -0.96, -0.32, 0.32, 0.96, 1.6],
    sideZ: 0.97,
    straight: 1.45,
  }),
);

/* ──────────────────────────── Kitchen ──────────────────────────── */

const kitchenBarSeats: SeatSpec[] = [
  { kind: "barStool", x: -0.3, z: -0.5, rotation: 0, height: 0.75 },
  { kind: "barStool", x: 0.3, z: -0.5, rotation: 0, height: 0.75 },
];
const kitchen4Seats = headFirst([
  seat("woodChair", -0.74, 0),
  seat("woodChair", 0, 0.74),
  seat("woodChair", 0, -0.74),
  seat("woodChair", 0.74, 0),
]);
const kitchenFarmhouseSeats: SeatSpec[] = [
  { kind: "woodChair", x: -0.6, z: -0.76, rotation: 0 },
  { kind: "bench", x: 0, z: 0.7, rotation: 180, length: 1.6 },
  { kind: "woodChair", x: 0, z: -0.76, rotation: 0 },
  { kind: "woodChair", x: 0.6, z: -0.76, rotation: 0 },
];
const islandStool = (x: number, side: 1 | -1): SeatSpec => ({
  kind: "barStool",
  x,
  z: side * 0.8,
  rotation: side === 1 ? 180 : 0,
  height: 0.7,
});
const kitchenIslandSeats: SeatSpec[] = headFirst([
  islandStool(-0.93, -1),
  ...[-0.93, -0.31, 0.31, 0.93].map((x) => islandStool(x, 1)),
  ...[-0.31, 0.31, 0.93].map((x) => islandStool(x, -1)),
]);

/* ────────────────────────── Living room ────────────────────────── */

const living2Couch: CouchSpec = { seats: 2, seatWidth: 0.68, armWidth: 0.12, depth: 0.88, x: 0, z: -0.52, rotation: 0 };
const living3Couch: CouchSpec = { seats: 3, seatWidth: 0.62, armWidth: 0.12, depth: 0.9, x: 0, z: -0.88, rotation: 0 };
/** 3-seater + corner + side module: 2.04 - 0.12 + 0.9 = 2.82 m long, 2.0 m deep. */
const livingLCouch: CouchSpec = {
  seats: 3,
  seatWidth: 0.6,
  armWidth: 0.12,
  depth: 0.9,
  sideLength: 1.1,
  x: -0.39,
  z: -0.55,
  rotation: 0,
};
/** The 1-seater is a 1-seat couch, so it STRETCHES into the 2- and 3-seater. */
const living1Couch: CouchSpec = { ...ARMCHAIR, x: -0.3, z: -0.18, rotation: 18 };

/* ─────────────────────────── Catalogue ─────────────────────────── */

export const CATEGORIES: Category[] = [
  {
    id: "dining",
    label: "Dining",
    heading: "Your dining table",
    finishTarget: "tabletop",
    finishes: WOOD_FINISHES,
    defaultFinish: "white",
    sizes: [
      {
        id: "dining-2",
        label: "2 seats",
        name: "Ondo Bistro Table",
        price: 320000,
        caption: "Seats 2 · Ø 75 cm",
        seats: 2,
        setup: {
          platform: { length: 2.7, width: 2.7 },
          table: table({ length: 0.75, width: 0.75, radius: 0.375 }),
          seats: dining2Seats,
          person: personOn(dining2Seats[0]!),
        },
      },
      {
        id: "dining-4",
        label: "4 seats",
        name: "Ondo Round Table",
        price: 540000,
        caption: "Seats 4 · Ø 110 cm",
        seats: 4,
        setup: {
          platform: { length: 3.1, width: 3.1 },
          table: table({ length: 1.1, width: 1.1, radius: 0.55 }),
          seats: dining4Seats,
          person: personOn(dining4Seats[0]!),
        },
      },
      {
        id: "dining-6",
        label: "6 seats",
        name: "Ondo Dining Table",
        price: 850000,
        caption: "Seats 6 · 180 × 95 cm",
        seats: 6,
        setup: {
          platform: { length: 4.1, width: 3.1 },
          table: table({ length: 1.8, width: 0.95, radius: 0.475 }),
          seats: dining6Seats,
          person: personOn(dining6Seats[0]!),
        },
      },
      {
        id: "dining-10",
        label: "10 seats",
        name: "Ondo Banquet Table",
        price: 1450000,
        caption: "Seats 10 · 300 × 105 cm",
        seats: 10,
        setup: {
          platform: { length: 5.5, width: 3.2 },
          table: table({ length: 3.0, width: 1.05, radius: 0.525 }),
          seats: dining10Seats,
          person: personOn(dining10Seats[0]!),
        },
      },
    ],
  },
  {
    id: "office",
    label: "Office",
    heading: "Your office setup",
    finishTarget: "tabletop",
    finishes: WOOD_FINISHES,
    defaultFinish: "white",
    sizes: [
      {
        id: "office-1",
        label: "Just me",
        name: "Ondo Solo Desk",
        price: 380000,
        caption: "1 person · 140 × 70 cm",
        seats: 1,
        setup: {
          platform: { length: 2.7, width: 2.7 },
          table: table({ length: 1.4, width: 0.7, radius: 0.04, height: 0.74, base: "legs", family: "desk" }),
          seats: officeSoloSeats,
          person: personOn(officeSoloSeats[0]!),
          laptop: { x: 0.05, z: -0.06, rotation: 180 },
        },
      },
      {
        id: "office-4",
        label: "2–4",
        name: "Ondo Meeting Table",
        price: 620000,
        caption: "Seats 4 · Ø 120 cm",
        seats: 4,
        setup: {
          platform: { length: 3.3, width: 3.3 },
          table: table({ length: 1.2, width: 1.2, radius: 0.6, height: 0.74 }),
          seats: office4Seats,
          person: personOn(office4Seats[0]!),
        },
      },
      {
        id: "office-10",
        label: "5–10",
        name: "Ondo Boardroom Table",
        price: 1650000,
        caption: "Seats 10 · 300 × 120 cm",
        seats: 10,
        setup: {
          platform: { length: 5.7, width: 3.5 },
          table: table({ length: 3.0, width: 1.2, radius: 0.6, height: 0.74 }),
          seats: office10Seats,
          person: personOn(office10Seats[0]!),
        },
      },
      {
        id: "office-14",
        label: "11+",
        name: "Ondo Executive Boardroom",
        price: 2400000,
        caption: "Seats 14 · 420 × 130 cm",
        seats: 14,
        setup: {
          platform: { length: 6.9, width: 3.6 },
          table: table({ length: 4.2, width: 1.3, radius: 0.65, height: 0.74 }),
          seats: office14Seats,
          person: personOn(office14Seats[0]!),
        },
      },
    ],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    heading: "Your kitchen table",
    finishTarget: "tabletop",
    finishes: WOOD_FINISHES,
    defaultFinish: "oak",
    sizes: [
      {
        id: "kitchen-2",
        label: "2 seats",
        name: "Ondo Breakfast Bar",
        price: 290000,
        caption: "Seats 2 · 120 × 45 cm",
        seats: 2,
        setup: {
          platform: { length: 2.6, width: 2.6 },
          table: table({ length: 1.2, width: 0.45, radius: 0.05, height: 1.02, base: "legs", family: "bar" }),
          seats: kitchenBarSeats,
          person: personOn(kitchenBarSeats[0]!),
        },
      },
      {
        id: "kitchen-4",
        label: "4 seats",
        name: "Ondo Square Table",
        price: 450000,
        caption: "Seats 4 · 90 × 90 cm",
        seats: 4,
        setup: {
          platform: { length: 2.9, width: 2.9 },
          table: table({ length: 0.9, width: 0.9, radius: 0.12, base: "legs", family: "kitchen" }),
          seats: kitchen4Seats,
          person: personOn(kitchen4Seats[0]!),
        },
      },
      {
        id: "kitchen-6",
        label: "6 seats",
        name: "Ondo Farmhouse Table",
        price: 780000,
        caption: "Seats 6 · 190 × 90 cm",
        seats: 6,
        setup: {
          platform: { length: 3.9, width: 3.1 },
          table: table({ length: 1.9, width: 0.9, radius: 0.04, thickness: 0.06, base: "legs", family: "kitchen" }),
          seats: kitchenFarmhouseSeats,
          person: personOn(kitchenFarmhouseSeats[0]!),
        },
      },
      {
        id: "kitchen-8",
        label: "8 seats",
        name: "Ondo Kitchen Island",
        price: 1250000,
        caption: "Seats 8 · 260 × 100 cm",
        seats: 8,
        setup: {
          platform: { length: 4.6, width: 3.3 },
          table: table({ length: 2.6, width: 1.0, radius: 0.06, thickness: 0.08, height: 0.95, base: "cabinet", family: "island" }),
          seats: kitchenIslandSeats,
          person: personOn(kitchenIslandSeats[0]!),
        },
      },
    ],
  },
  {
    id: "living",
    label: "Living room",
    heading: "Your living room",
    finishTarget: "fabric",
    finishes: FABRIC_FINISHES,
    defaultFinish: "charcoal",
    sizes: [
      {
        id: "living-1",
        label: "1-seater",
        name: "Ondo Lounge Chair",
        price: 420000,
        caption: "1-seater · 85 × 80 cm",
        seats: 1,
        setup: {
          platform: { length: 2.6, width: 2.6 },
          table: table({ length: 0.46, width: 0.46, radius: 0.23, height: 0.52, thickness: 0.03, x: 0.48, z: -0.12, family: "side" }),
          seats: [],
          couch: living1Couch,
          person: personOnCouch(living1Couch),
          lamp: { x: 0.62, z: -0.72 },
        },
      },
      {
        id: "living-2",
        label: "2-seater",
        name: "Ondo Loveseat",
        price: 690000,
        caption: "2-seater · 160 × 88 cm",
        seats: 2,
        setup: {
          platform: { length: 3.0, width: 3.0 },
          table: table({ length: 0.8, width: 0.5, radius: 0.12, height: 0.38, thickness: 0.035, base: "legs", z: 0.45, family: "coffee" }),
          seats: [],
          couch: living2Couch,
          person: personOnCouch(living2Couch),
          rug: { length: 2.1, width: 1.7, x: 0, z: 0.05 },
        },
      },
      {
        id: "living-3",
        label: "3-seater",
        name: "Ondo Sofa Set",
        price: 1350000,
        caption: "3-seater · 210 × 90 cm",
        seats: 5,
        setup: {
          platform: { length: 4.0, width: 3.5 },
          table: table({ length: 1.1, width: 0.6, radius: 0.06, height: 0.4, thickness: 0.04, base: "legs", z: 0.22, family: "coffee" }),
          seats: [armchair(-1.3, 0.35, 115), armchair(1.3, 0.35, -115)],
          couch: living3Couch,
          person: personOnCouch(living3Couch),
          rug: { length: 3.3, width: 2.5, x: 0, z: 0.05 },
        },
      },
      {
        id: "living-l",
        label: "L-sectional",
        name: "Ondo Corner Sectional",
        price: 2100000,
        caption: "L-sectional · 280 × 200 cm",
        seats: 6,
        setup: {
          platform: { length: 4.6, width: 3.8 },
          table: table({ length: 1.2, width: 0.75, radius: 0.08, height: 0.38, thickness: 0.045, base: "legs", x: -0.3, z: 0.3, family: "coffee" }),
          seats: [armchair(-1.6, 0.42, 105)],
          couch: livingLCouch,
          person: personOnCouch(livingLCouch),
          rug: { length: 3.6, width: 2.7, x: -0.2, z: 0.1 },
        },
      },
    ],
  },
];

export const DEFAULT_CATEGORY: CategoryId = "dining";
/** Size slot (0–3) selected on load. The slot is kept across categories. */
export const DEFAULT_SIZE_SLOT = 2;

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]!;
}

export function formatPrice(price: number) {
  return `${CURRENCY}${price.toLocaleString("en-US")}`;
}

/** "Seats 6 · 180 × 95 cm" → "180 × 95 cm". */
export function dimensionsOf(size: SizeOption) {
  const parts = size.caption.split("·");
  return (parts[parts.length - 1] ?? size.caption).trim();
}
