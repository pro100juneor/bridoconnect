import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import PublicLayout from "./components/public/PublicLayout";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { PageTransition } from "./components/PageTransition";

import HomePage from "./pages/public/HomePage";
import HowItWorksPage from "./pages/public/HowItWorksPage";
import TransparencyPage from "./pages/public/TransparencyPage";
import LivePage from "./pages/public/LivePage";
import AboutPage from "./pages/public/AboutPage";
import FaqPage from "./pages/public/FaqPage";
import ShopCatalogPage from "./pages/public/ShopCatalogPage";
import VerificationPage from "./pages/public/VerificationPage";
import ImpressumPage from "./pages/public/ImpressumPage";
import DatenschutzPage from "./pages/public/DatenschutzPage";
import AGBPage from "./pages/public/AGBPage";
import SupportPage from "./pages/public/SupportPage";
// Heavy routes are code-split so livekit-client (streams) and the 200-theme
// storefront engine don't bloat the main bundle.
const StorefrontPage = lazy(() => import("./pages/public/StorefrontPage"));
const RecipientPage = lazy(() => import("./pages/public/RecipientPage"));

import Auth from "./pages/Auth";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

import Feed from "./pages/app/Feed";
import LiveStreams from "./pages/app/LiveStreams";
const StartStream = lazy(() => import("./pages/app/StartStream"));
const StreamViewer = lazy(() => import("./pages/app/StreamViewer"));
import CreateDeal from "./pages/app/CreateDeal";
import Shop from "./pages/app/Shop";
import ShopDetail from "./pages/app/ShopDetail";
import ProductDetail from "./pages/app/ProductDetail";
import CreateProduct from "./pages/app/CreateProduct";
const StorefrontEditor = lazy(() => import("./pages/app/StorefrontEditor"));
import Cart from "./pages/app/Cart";
import Profile from "./pages/app/Profile";
const RecipientPageEditor = lazy(() => import("./pages/app/RecipientPageEditor"));
import EditProfile from "./pages/app/EditProfile";
import PublicProfile from "./pages/app/PublicProfile";
import SponsorPage from "./pages/app/SponsorPage";
import SponsorPrivacy from "./pages/app/SponsorPrivacy";
import Wallet from "./pages/app/Wallet";
import Settings from "./pages/app/Settings";
import Admin from "./pages/app/Admin";
import ChatList from "./pages/app/ChatList";
import Chat from "./pages/app/Chat";
import Notifications from "./pages/app/Notifications";
import ActiveDeal from "./pages/app/ActiveDeal";
import DealHistory from "./pages/app/DealHistory";
import Dispute from "./pages/app/Dispute";
import Wishlist from "./pages/app/Wishlist";
import Premium from "./pages/app/Premium";
import Search from "./pages/app/Search";
import PromoteMe from "./pages/app/PromoteMe";
import ResetPassword from "./pages/app/ResetPassword";

export default function App() {
  return (
    <PageTransition>
      <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
        <Routes>
          <Route element={<PublicLayout />}>
            {/* Native app opens into the product (feed → login if no session),
                not the marketing landing — otherwise it reads as a one-page site.
                Web keeps the marketing HomePage; /home reaches it on native too. */}
            <Route
              path="/"
              element={Capacitor.isNativePlatform() ? <Navigate to="/app" replace /> : <HomePage />}
            />
            <Route path="/home" element={<HomePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/transparency" element={<TransparencyPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/shop" element={<ShopCatalogPage />} />
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="/agb" element={<AGBPage />} />
            <Route path="/support" element={<SupportPage />} />
          </Route>

          {/* Public branded storefront — no login, no shared layout (self-contained). */}
          <Route path="/store/:slug" element={<StorefrontPage />} />

          {/* Public recipient page — social-style profile, open to everyone. */}
          <Route path="/u/:slug" element={<RecipientPage />} />

          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<Feed />} />
              <Route path="/app/live" element={<LiveStreams />} />
              <Route path="/app/live/start" element={<StartStream />} />
              <Route path="/app/live/:id" element={<StreamViewer />} />
              <Route path="/app/create-deal" element={<CreateDeal />} />
              <Route path="/app/shop" element={<Shop />} />
              <Route path="/app/cart" element={<Cart />} />
              <Route path="/app/shop/new" element={<CreateProduct />} />
              <Route path="/app/shop/design" element={<StorefrontEditor />} />
              <Route path="/app/shop/seller/:id" element={<ShopDetail />} />
              <Route path="/app/shop/:id" element={<ProductDetail />} />
              <Route path="/app/profile" element={<Profile />} />
              <Route path="/app/profile/edit" element={<EditProfile />} />
              <Route path="/app/my-page" element={<RecipientPageEditor />} />
              <Route path="/app/search" element={<Search />} />
              <Route path="/app/promote" element={<PromoteMe />} />
              <Route path="/app/chats" element={<ChatList />} />
              <Route path="/app/chat/:id" element={<Chat />} />
              <Route path="/app/notifications" element={<Notifications />} />
              <Route path="/app/deal/:id" element={<ActiveDeal />} />
              <Route path="/app/deals" element={<DealHistory />} />
              <Route path="/app/dispute/:id" element={<Dispute />} />
              <Route path="/app/wallet" element={<Wallet />} />
              <Route path="/app/wishlist" element={<Wishlist />} />
              <Route path="/app/user/:id" element={<PublicProfile />} />
              <Route path="/app/sponsor/:id" element={<SponsorPage />} />
              <Route path="/app/sponsor-privacy" element={<SponsorPrivacy />} />
              <Route path="/app/settings" element={<Settings />} />
              <Route path="/app/admin" element={<Admin />} />
              <Route path="/app/premium" element={<Premium />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PageTransition>
  );
}
