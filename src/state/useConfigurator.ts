import { useMemo } from "react";
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  DEFAULT_SIZE_SLOT,
  DEFAULT_TABLETOP,
  getCategory,
  type CategoryId,
  type CouchStyle,
} from "../data/furniture";
import { createStore, useStore } from "./store";

export interface Selection {
  categoryId: CategoryId;
  /** Size slot 0–3, kept when the category changes. */
  slot: number;
  finishes: Record<CategoryId, string>;
  style: CouchStyle;
}

/** The selection lives outside the page so it survives a trip to the cart
 *  (and "Edit" in the cart can preselect an exact setup). */
export const selection = createStore<Selection>({
  categoryId: DEFAULT_CATEGORY,
  slot: DEFAULT_SIZE_SLOT,
  finishes: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.defaultFinish])) as Record<CategoryId, string>,
  style: "modern",
});

/** Everything derived from a selection (also used to rebuild cart setups). */
export function deriveSelection(s: Selection) {
  const category = getCategory(s.categoryId);
  const size = category.sizes[s.slot] ?? category.sizes[0];
  const finishId = s.finishes[s.categoryId];
  const finish = category.finishes.find((f) => f.id === finishId) ?? category.finishes[0]!;
  const isFabric = category.finishTarget === "fabric";
  // Fabric always follows the living room's chosen finish, so entering the
  // living room doesn't tween the couch colour.
  const living = getCategory("living");
  const fabric = living.finishes.find((f) => f.id === s.finishes.living) ?? living.finishes[0]!;
  return {
    category,
    size,
    finish,
    tabletop: isFabric ? DEFAULT_TABLETOP : finish.color,
    fabric: fabric.color,
  };
}

/** The customer's selection + everything derived from it. */
export function useConfigurator() {
  const s = useStore(selection);
  const derived = useMemo(() => deriveSelection(s), [s]);
  return {
    categoryId: s.categoryId,
    slot: s.slot,
    style: s.style,
    ...derived,
    setCategory: (categoryId: CategoryId) => selection.set((p) => ({ ...p, categoryId })),
    setSlot: (slot: number) => selection.set((p) => ({ ...p, slot })),
    setStyle: (style: CouchStyle) => selection.set((p) => ({ ...p, style })),
    setFinish: (id: string) => selection.set((p) => ({ ...p, finishes: { ...p.finishes, [p.categoryId]: id } })),
  };
}

export type Configurator = ReturnType<typeof useConfigurator>;
