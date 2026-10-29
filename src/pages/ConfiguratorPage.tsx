import { useReducedMotion } from "framer-motion";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { launch } from "../cart/flight";
import { ViewCartButton } from "../cart/ViewCartButton";
import { LazyScene } from "../scene/LazyScene";
import type { SceneApi } from "../scene/Scene";
import { addToCart, itemFromSelection } from "../state/cart";
import { useThemeContext } from "../state/themeContext";
import { selection, useConfigurator } from "../state/useConfigurator";
import { CrossfadeText } from "../ui/CrossfadeText";
import { Page } from "../ui/Page";
import { Panel } from "../ui/Panel";

/** Size of the snapshot that lifts off the scene. */
const SNAPSHOT = 168;

export function ConfiguratorPage() {
  const c = useConfigurator();
  const { theme, toggle } = useThemeContext();
  const reduced = useReducedMotion() ?? false;
  const sceneEl = useRef<HTMLDivElement>(null);
  const api = useRef<SceneApi | null>(null);
  const onReady = useCallback((a: SceneApi) => {
    api.current = a;
  }, []);

  // "Added ✓" for 1.2 s after a click.
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const onAdd = () => {
    const thumb = api.current?.capture() ?? undefined;
    const flying = !!thumb && !reduced && !!sceneEl.current;
    addToCart(itemFromSelection(selection.get(), thumb), { deferBadge: flying });
    if (flying) {
      const r = sceneEl.current!.getBoundingClientRect();
      const size = Math.min(SNAPSHOT, r.width * 0.45, r.height * 0.45);
      launch(thumb, { x: r.left + r.width / 2, y: r.top + r.height / 2, size });
    }
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1200);
  };

  return (
    <Page className="flex min-h-svh flex-col desk:grid desk:h-svh desk:grid-cols-[38%_62%] desk:overflow-hidden">
      <main className="px-6 py-8 sm:px-10 desk:h-svh desk:overflow-y-auto desk:px-[72px] desk:py-[72px]">
        <Panel c={c} theme={theme} onToggleTheme={toggle} onAdd={onAdd} added={added} />
      </main>

      <section aria-label="Room preview" className="relative order-first h-[55vh] desk:order-none desk:h-svh">
        <div ref={sceneEl} className="absolute inset-0">
          <Suspense fallback={null}>
            <LazyScene
              category={c.category}
              slot={c.slot}
              size={c.size}
              style={c.style}
              tabletop={c.tabletop}
              fabric={c.fabric}
              reduced={reduced}
              theme={theme}
              onReady={onReady}
            />
          </Suspense>
        </div>
        <p
          className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center text-[12px] text-muted desk:bottom-8"
          aria-live="polite"
        >
          <CrossfadeText text={c.size.caption} />
        </p>
        <ViewCartButton className="absolute bottom-3 right-4 desk:bottom-6 desk:right-8" />
      </section>
    </Page>
  );
}
