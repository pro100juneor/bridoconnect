import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/public/PublicLayout";
import HomePage from "./pages/public/HomePage";
import HowItWorksPage from "./pages/public/HowItWorksPage";
import TransparencyPage from "./pages/public/TransparencyPage";
import LivePage from "./pages/public/LivePage";
import AboutPage from "./pages/public/AboutPage";
import FaqPage from "./pages/public/FaqPage";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Feed from "./pages/app/Feed";
import Profile from "./pages/app/Profile";
import LiveStreams from "./pages/app/LiveStreams";
import CreateDeal from "./pages/app/CreateDeal";
import Shop from "./pages/app/Shop";

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
      <Route path="/app" element={<Feed />} />
      <Route path="/app/live" element={<LiveStreams />} />
      <Route path="/app/create-deal" element={<CreateDeal />} />
      <Route path="/app/shop" element={<Shop />} />
      <Route path="/app/profile" element={<Profile />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
