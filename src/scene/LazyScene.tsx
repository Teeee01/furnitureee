import { lazy } from "react";

// three.js loads in its own chunk so the page paints first.
export const LazyScene = lazy(() => import("./Scene").then((m) => ({ default: m.Scene })));
