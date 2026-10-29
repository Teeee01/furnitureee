# Forma — furniture configurator

A single-page configurator: pick a category and a size on the left, the
isometric 3D room on the right morphs to match: tables stretch, chairs
leave and arrive one by one, couches grow cushion by cushion, the camera
follows.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

Stack: React 19 + TypeScript + Vite, Tailwind CSS 4, three.js via
@react-three/fiber + drei, @react-spring/three for every 3D motion,
framer-motion for the 2D UI.

## Themes

Dark and light. Every colour of both — UI and 3D scene — is in
`src/theme.ts`. `vite.config.ts` writes the UI tokens into `index.html` as
CSS variables with a tiny boot script, so the first paint already uses the
visitor's stored choice (`localStorage`, key `forma-theme`) or their system
setting. The scene reads the same object through springs
(`src/scene/sceneTheme.ts`): materials, lights and shadow strengths tween
over 400 ms on a switch, independently of any furniture animation.

## Pages

| Route              | What                                                         |
| ------------------ | ------------------------------------------------------------ |
| `/`                | Configurator. "Add to cart" snapshots the 3D scene and flies it into the cart button. |
| `/cart`            | Cart: quantities, remove / undo, assembly, promo `FORMA10`, order summary. |
| `/checkout`        | Delivery → Payment → Review (`?step=…`, so the back button steps back). |
| `/order-confirmed` | The last order (kept in localStorage).                        |

The payment step is a **demo**: nothing is charged, and card details are only
formatted and validated in memory — never saved or sent. The cart lives in
localStorage (`forma-cart`), checkout progress in sessionStorage
(`forma-checkout`, without card data). Price rules (free delivery threshold,
delivery, express, assembly, promo codes) are in `src/state/pricing.ts`.

## Deploy (Vercel)

Framework preset **Vite**, build command `npm run build`, output directory
`dist`, install command `npm install` (default). Node ≥ 20.19.
`vercel.json` rewrites every path to `index.html` so `/cart`, `/checkout` and
`/order-confirmed` load directly.

## Where things live

```
src/theme.ts               ALL colours (UI + scene) for the dark and light themes
src/data/furniture.ts      ALL product data: categories, sizes, names, prices,
                           captions, dimensions, table specs, seat positions,
                           couch modules, rug / lamp / laptop placement
src/state/useConfigurator  selection (category, size slot, finish, style)
src/state/cart.ts          cart store (localStorage), add / quantity / remove / undo
src/state/pricing.ts       ALL price rules: delivery, express, assembly, promo codes
src/pages/                 Configurator, Cart, Checkout, OrderConfirmed
src/checkout/              checkout steps, validation, Nigerian states, demo card checks
src/cart/                  flying snapshot, View cart button, thumbnails, summary lines
src/ui/                    panel, radiogroups (arrow keys), swatches, logo
src/scene/anim/config.ts   ALL motion numbers: springs, durations, phase times
src/scene/anim/director.ts THE DIRECTOR: diffs layouts, runs the choreography
src/scene/Scene.tsx        canvas, lights, shadows; hands changes to the director
src/scene/Room.tsx         renders the director's items, mouse tilt, warm-up
src/scene/CameraRig.tsx    isometric camera, zoom-to-fit (camera springs)
src/scene/Platform.tsx     the floating slab + its soft floor shadow
src/scene/geometry.ts      rounded-rectangle extrusion (tabletops, platform…)
src/scene/furniture/       Table (top + pedestal / legs / cabinet), Chairs
                           (dining, office, wood chair, bar stool, bench), Couch
src/scene/props/           Person, Plant, Sign, Laptop, FloorLamp, Rug
```

## Editing the data

Units are metres; the platform top is `y = 0`; `x` runs along the table,
`z` across it; the camera looks from `+x / +z`. `rotation` is in degrees and
`0` faces `+z`.

- **Tables** are one rounded rectangle: `length`, `width`, `radius`,
  `thickness`, `height`. Round = `length === width`, `radius = width / 2`.
  Pill = `radius = width / 2`. Desk / kitchen = small radius.
- **Seats** are listed person first, then outward. Helpers `ring()` and
  `around()` place chairs around round / long tables and turn them to face
  the table; you can also write `{ kind, x, z, rotation }` by hand.
- **Couches** are modules: `length = seats × seatWidth + 2 × armWidth`.
  `sideLength` makes an L-sectional (corner + side module replace the right
  arm).
- **Platform** size is set per size; the plant and sign sit in its corners
  and the camera zooms to fit it.

## How the motion works

Every animated number is a react-spring `SpringValue` owned by the director
(`src/scene/anim/director.ts`); components read them in `useFrame`, so
nothing re-renders per frame.

- **Items and keys.** A layout is a set of keyed items. Same key in the old
  and new layout = the same piece, which morphs/glides. Chairs are keyed by
  category, table family and kind (`dining:round:dining#3`), so the chairs of
  a round dining table glide to the pill table's seats, but a desk's chair
  never turns into a meeting chair.
- **Table families** (`family` in the data) decide morph vs swap: same
  family → the top stretches (round → pill → long pill); different family
  (desk ↔ round, bar ↔ square, island ↔ farmhouse) → the old piece shrinks
  to 25% and fades while the new one springs in from 0.6.
- **Choreography.** A change schedules phases with timers (exit stagger
  far-end first → anticipation squash → morph + platform → camera on a
  softer spring → staggered enter, person-end first). Times and springs are
  in `anim/config.ts`.
- **Interruptions.** A new change clears pending timers and re-plans from
  wherever every spring is. Springs retarget mid-flight; an item mid-exit
  that is needed again reverses straight back; nothing queues or restarts.
- **Couches** are springs too: base length (`inner`), seat width, depth,
  sectional progress (corner + side module slide out), three style weights
  (Modern / Curved / Classic morph) and a presence spring per cushion.
- **Reduced motion** (`prefers-reduced-motion`): the canvas dips for one
  200 ms crossfade and the new layout appears at its midpoint; no overshoot,
  stagger, idle sway, head turns or tilt.

Debug: in `npm run dev`, `window.__forma` is the director (inspect springs
with e.g. `__forma.items`).

## Replacing a piece with a GLB

Each piece is its own component with a documented local space (seat centre
at the origin, sitter facing `+z`). Swap the body of e.g. `OfficeChair` for
`useGLTF("/models/office-chair.glb")` and keep the same origin / facing.
