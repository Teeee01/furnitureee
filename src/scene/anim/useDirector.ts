import { createContext, useContext, useSyncExternalStore } from "react";
import type { Director, Item } from "./director";
import { enterScale } from "./director";

export const DirectorContext = createContext<Director | null>(null);

export function useDirector() {
  const d = useContext(DirectorContext);
  if (!d) throw new Error("useDirector outside <DirectorContext>");
  return d;
}

/** The items on stage. Re-renders only when items mount / unmount. */
export function useItems(): Item[] {
  const d = useDirector();
  useSyncExternalStore(d.subscribe, d.getVersion);
  return [...d.items.values()];
}

/** Displayed presence: entering items land on a 1.06 peak and never dip
 *  below the floor; exiting items sink freely. */
export function presenceOf(a: { s: { get(): number; goal: number }; dy: { get(): number; goal: number } }, peak?: number) {
  const s = a.s.get();
  const entering = a.s.goal >= 1;
  return {
    scale: Math.max(0, entering ? enterScale(s, peak) : s),
    dy: entering ? Math.max(0, a.dy.get()) : a.dy.get(),
  };
}

