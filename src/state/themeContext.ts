import { createContext, useContext } from "react";
import type { ThemeName } from "../theme";

export const ThemeContext = createContext<{ theme: ThemeName; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);
