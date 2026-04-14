import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/public/HomePage";
import HowItWorksPage from "./pages/public/HowItWorksPage";
import TransparencyPage from "./pages/public/TransparencyPage";
import LivePage from "./pages/public/LivePage";
import AboutPage from "./pages/public/AboutPage";
import FaqPage from "./pages/public/FaqPage";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import PublicLayout from "./components/public/PublicLayout";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/transparency" element={<TransparencyPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
      </Route>
      <Route path="/auth" element={<Auth />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
