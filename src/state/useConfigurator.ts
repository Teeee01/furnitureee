import { useMemo, useState } from "react";
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  DEFAULT_SIZE_SLOT,
  DEFAULT_TABLETOP,
  getCategory,
  type CategoryId,
  type CouchStyle,
} from "../data/furniture";

/** The customer's selection + everything derived from it. */
export function useConfigurator() {
  const [categoryId, setCategoryId] = useState<CategoryId>(DEFAULT_CATEGORY);
  /** Size slot 0–3, kept when the category changes. */
  const [slot, setSlot] = useState(DEFAULT_SIZE_SLOT);
  const [finishes, setFinishes] = useState<Record<CategoryId, string>>(
    () => Object.fromEntries(CATEGORIES.map((c) => [c.id, c.defaultFinish])) as Record<CategoryId, string>,
  );
  const [style, setStyle] = useState<CouchStyle>("modern");

  const derived = useMemo(() => {
    const category = getCategory(categoryId);
    const size = category.sizes[slot] ?? category.sizes[0];
    const finishId = finishes[categoryId];
    const finish = category.finishes.find((f) => f.id === finishId) ?? category.finishes[0]!;
    const isFabric = category.finishTarget === "fabric";
    // Fabric always follows the living room's chosen finish, so entering the
    // living room doesn't tween the couch colour.
    const living = getCategory("living");
    const fabric = living.finishes.find((f) => f.id === finishes.living) ?? living.finishes[0]!;
    return {
      category,
      size,
      finish,
      tabletop: isFabric ? DEFAULT_TABLETOP : finish.color,
      fabric: fabric.color,
    };
  }, [categoryId, slot, finishes]);

  return {
    categoryId,
    slot,
    style,
    ...derived,
    setCategory: setCategoryId,
    setSlot,
    setStyle,
    setFinish: (id: string) => setFinishes((f) => ({ ...f, [categoryId]: id })),
  };
}

export type Configurator = ReturnType<typeof useConfigurator>;
