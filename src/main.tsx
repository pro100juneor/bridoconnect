import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "@/hooks/useCart";
import { Toaster } from "@/components/ui/toaster";
import { CookieConsent } from "@/components/CookieConsent";
import { bootObservability } from "@/lib/observability";
import App from "./App.tsx";
import "./index.css";

bootObservability();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <App />
        <Toaster />
        <CookieConsent />
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);
