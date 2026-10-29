import { useCallback, useEffect, useRef, useState } from "react";
import { THEME_STORAGE_KEY, THEME_TWEEN_MS, type ThemeName } from "../theme";

function stored(): ThemeName | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

/**
 * The colour theme. Starts from what the boot script in index.html picked
 * (the stored choice, else the system setting), follows the system while the
 * visitor hasn't chosen, and remembers an explicit choice.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const apply = useCallback((t: ThemeName) => {
    const html = document.documentElement;
    // Every UI colour tweens while this class is on.
    html.classList.add("theme-switching");
    html.dataset.theme = t;
    html.style.colorScheme = t;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => html.classList.remove("theme-switching"), THEME_TWEEN_MS + 50);
    setTheme(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return;
    const onChange = () => {
      if (!stored()) apply(mq.matches ? "light" : "dark");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [apply]);

  const toggle = useCallback(() => {
    const next: ThemeName = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / blocked storage: the switch still works for this visit.
    }
    apply(next);
  }, [theme, apply]);

  return { theme, toggle };
}
