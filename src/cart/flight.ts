import { createStore } from "../state/store";

/** A snapshot flying from the scene into the "View cart" button. */
export interface Flight {
  id: number;
  src: string;
  from: { x: number; y: number; size: number };
}

export const flights = createStore<Flight[]>([]);
let nextId = 1;

/** The "View cart" button registers itself so flights know where to land. */
export const cartTarget: { el: HTMLElement | null } = { el: null };

export function launch(src: string, from: Flight["from"]) {
  flights.set((f) => [...f, { id: nextId++, src, from }]);
}
