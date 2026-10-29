import { animate, useMotionValue, useReducedMotion, motion } from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { landBadge } from "../state/cart";
import { useStore } from "../state/store";
import { cartTarget, flights, type Flight } from "./flight";

/**
 * Snapshots of the scene fly along a gentle curve into the "View cart"
 * button (600 ms, ease-in-out, shrinking as they go). On landing, the badge
 * catches up (rolls to the new count) and the button bounces.
 */
export function FlyLayer() {
  const list = useStore(flights);
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
      {list.map((f) => (
        <FlyingSnapshot key={f.id} flight={f} />
      ))}
    </div>,
    document.body,
  );
}

function FlyingSnapshot({ flight }: { flight: Flight }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(flight.from.x - flight.from.size / 2);
  const y = useMotionValue(flight.from.y - flight.from.size / 2);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(0);

  useEffect(() => {
    const done = () => {
      landBadge();
      flights.set((all) => all.filter((f) => f.id !== flight.id));
    };
    const el = cartTarget.el;
    if (reduced || !el) {
      done();
      return;
    }
    const r = el.getBoundingClientRect();
    const size = flight.from.size;
    const p0 = { x: flight.from.x, y: flight.from.y };
    const p2 = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    // Control point: above the midpoint, so the path is a gentle arc.
    const p1 = { x: (p0.x + p2.x) / 2, y: Math.min(p0.y, p2.y) - Math.abs(p2.x - p0.x) * 0.25 - 60 };
    const endScale = 28 / size;
    const lift = animate(opacity, 1, { duration: 0.12 });
    const fly = animate(0, 1, {
      duration: 0.6,
      ease: [0.45, 0, 0.25, 1],
      onUpdate: (t) => {
        const u = 1 - t;
        const px = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
        const py = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
        x.set(px - size / 2);
        y.set(py - size / 2);
        scale.set(1 + (endScale - 1) * t);
        if (t > 0.85) opacity.set((1 - t) / 0.15);
      },
      onComplete: done,
    });
    return () => {
      lift.stop();
      fly.stop();
    };
  }, [flight, reduced, x, y, scale, opacity]);

  return (
    <motion.img
      src={flight.src}
      alt=""
      className="absolute left-0 top-0 rounded-xl border border-line bg-btn object-cover shadow-[0_8px_24px_rgb(0_0_0/0.25)]"
      style={{ x, y, scale, opacity, width: flight.from.size, height: flight.from.size }}
    />
  );
}
