import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/public/PublicLayout";
import AppLayout from "./components/layout/AppLayout";
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
import LiveStreams from "./pages/app/LiveStreams";
import CreateDeal from "./pages/app/CreateDeal";
import Shop from "./pages/app/Shop";
import Profile from "./pages/app/Profile";
import Wallet from "./pages/app/Wallet";
import Settings from "./pages/app/Settings";
import ChatList from "./pages/app/ChatList";
import Chat from "./pages/app/Chat";
import Notifications from "./pages/app/Notifications";
import ActiveDeal from "./pages/app/ActiveDeal";
import DealHistory from "./pages/app/DealHistory";
import Wallet2 from "./pages/app/Wishlist";
import PublicProfile from "./pages/app/PublicProfile";
import Premium from "./pages/app/Premium";
import EditProfile from "./pages/app/EditProfile";
import Search from "./pages/app/Search";
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
      <Route element={<AppLayout />}>
        <Route path="/app" element={<Feed />} />
        <Route path="/app/live" element={<LiveStreams />} />
        <Route path="/app/create-deal" element={<CreateDeal />} />
        <Route path="/app/shop" element={<Shop />} />
        <Route path="/app/profile" element={<Profile />} />
        <Route path="/app/profile/edit" element={<EditProfile />} />
        <Route path="/app/search" element={<Search />} />
        <Route path="/app/chats" element={<ChatList />} />
        <Route path="/app/chat/:id" element={<Chat />} />
        <Route path="/app/notifications" element={<Notifications />} />
        <Route path="/app/deal/:id" element={<ActiveDeal />} />
        <Route path="/app/deals" element={<DealHistory />} />
        <Route path="/app/wallet" element={<Wallet />} />
        <Route path="/app/wishlist" element={<Wallet2 />} />
        <Route path="/app/user/:id" element={<PublicProfile />} />
        <Route path="/app/settings" element={<Settings />} />
        <Route path="/app/premium" element={<Premium />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
