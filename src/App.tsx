import { MotionConfig, useReducedMotion } from "framer-motion";
import { lazy, Suspense } from "react";
import { CrossfadeText } from "./ui/CrossfadeText";
import { useConfigurator } from "./state/useConfigurator";
import { Panel } from "./ui/Panel";

// three.js loads in its own chunk so the panel paints first.
const Scene = lazy(() => import("./scene/Scene").then((m) => ({ default: m.Scene })));

export default function App() {
  const c = useConfigurator();
  const reduced = useReducedMotion() ?? false;
  return (
    <MotionConfig reducedMotion="user">
    <div className="flex min-h-svh flex-col bg-bg text-fg desk:grid desk:h-svh desk:grid-cols-[38%_62%] desk:overflow-hidden">
      <main className="px-6 py-8 sm:px-10 desk:h-svh desk:overflow-y-auto desk:px-[72px] desk:py-[72px]">
        <Panel c={c} />
      </main>

      <section aria-label="Room preview" className="relative order-first h-[55vh] desk:order-none desk:h-svh">
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <Scene
              category={c.category}
              slot={c.slot}
              size={c.size}
              style={c.style}
              tabletop={c.tabletop}
              fabric={c.fabric}
              reduced={reduced}
            />
          </Suspense>
        </div>
        <p className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center text-[12px] text-muted desk:bottom-8" aria-live="polite">
          <CrossfadeText text={c.size.caption} />
        </p>
        <button type="button" className="btn-pill absolute bottom-3 right-4 h-10 px-4 text-[12px] desk:bottom-6 desk:right-8 desk:h-8 desk:px-3.5">
          View cart
        </button>
      </section>
    </div>
    </MotionConfig>
  );
}
