import { Outlet } from "react-router-dom";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";

const PublicLayout = () => (
  <div className="min-h-screen flex flex-col">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
    >
      Перейти до основного вмісту
    </a>
    <PublicHeader />
    <main id="main-content" className="flex-1" tabIndex={-1}>
      <Outlet />
    </main>
    <PublicFooter />
  </div>
);
export default PublicLayout;
