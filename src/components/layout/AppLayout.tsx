import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, Radio, Plus, ShoppingBag, User } from "lucide-react";
const tabs = [{to:"/app",icon:Home,label:"Стрічка"},{to:"/app/live",icon:Radio,label:"Ефіри"},{to:"/app/create-deal",icon:Plus,label:""},{to:"/app/shop",icon:ShoppingBag,label:"Магазин"},{to:"/app/profile",icon:User,label:"Профіль"}];
export default function AppLayout() {
  const {pathname}=useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-screen-sm mx-auto">
      <div className="flex-1 pb-20"><Outlet /></div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-screen-sm bg-background border-t border-border z-50">
        <div className="flex items-center justify-around py-2">
          {tabs.map(({to,icon:Icon,label})=>(
            <Link key={to} to={to} className={`flex flex-col items-center gap-1 px-3 py-1 ${pathname===to?"text-accent":"text-muted-foreground"}`}>
              {to==="/app/create-deal"?<div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center -mt-4 shadow-lg"><Icon className="w-5 h-5 text-white"/></div>:<><Icon className="w-5 h-5"/><span className="text-[10px] font-medium">{label}</span></>}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
