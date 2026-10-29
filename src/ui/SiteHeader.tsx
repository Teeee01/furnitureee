import type { ReactNode } from "react";
import { useThemeContext } from "../state/themeContext";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/** Logo on the left; page links and the theme toggle on the right. */
export function SiteHeader({ children }: { children?: ReactNode }) {
  const { theme, toggle } = useThemeContext();
  return (
    <header className="flex items-center justify-between gap-4">
      <Logo />
      <div className="flex items-center gap-3">
        {children}
        <ThemeToggle theme={theme} onToggle={toggle} />
      </div>
    </header>
  );
}
