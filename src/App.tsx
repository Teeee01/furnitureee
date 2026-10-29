import { AnimatePresence, MotionConfig } from "framer-motion";
import { Route, Routes, useLocation } from "react-router";
import { FlyLayer } from "./cart/FlyLayer";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ConfiguratorPage } from "./pages/ConfiguratorPage";
import { OrderConfirmedPage } from "./pages/OrderConfirmedPage";
import { ThemeContext } from "./state/themeContext";
import { useTheme } from "./state/useTheme";

export default function App() {
  const theme = useTheme();
  const location = useLocation();
  return (
    <ThemeContext.Provider value={theme}>
      <MotionConfig reducedMotion="user">
        <div className="grid min-h-svh bg-bg text-fg">
          <AnimatePresence initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<ConfiguratorPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
              <Route path="*" element={<ConfiguratorPage />} />
            </Routes>
          </AnimatePresence>
        </div>
        <FlyLayer />
      </MotionConfig>
    </ThemeContext.Provider>
  );
}
