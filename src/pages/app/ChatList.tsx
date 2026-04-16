import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_CHATS = [
  { id:"1", name:"Оксана К.", flag:"🇺🇦", lastMsg:"Дякую за підтримку! Дуже допомогло", time:"14:32", unread:2, initials:"ОК" },
  { id:"2", name:"Ахмад Р.", flag:"🏳️", lastMsg:"Коли буде переказ?", time:"12:15", unread:0, initials:"АР" },
  { id:"3", name:"Марія Л.", flag:"🇺🇦", lastMsg:"Все отримала, дуже вдячна!", time:"Вчора", unread:1, initials:"МЛ" },
  { id:"4", name:"Fatima Al-Hassan", flag:"🏳️", lastMsg:"Thank you so much", time:"Вчора", unread:0, initials:"FA" },
];

const ChatList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [chats, setChats] = useState<any[]>(MOCK_CHATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    // Get deals where user is participant to find chat partners
    supabase.from("deals")
      .select("id, title, creator_id, sponsor_id, profiles!creator_id(name, avatar_url)")
      .or(`creator_id.eq.${user.id},sponsor_id.eq.${user.id}`)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            name: d.profiles?.name || "Учасник",
            flag: "🏳️",
            lastMsg: d.title,
            time: "",
            unread: 0,
            initials: (d.profiles?.name || "??").slice(0,2).toUpperCase(),
          }));
          setChats(formatted);
        }
        setLoading(false);
      });
  }, [user]);

  const filtered = chats.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground mb-3">Повідомлення</h2>
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Пошук чатів..."
            className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map(chat => (
            <button key={chat.id} onClick={() => navigate(`/app/chat/${chat.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {chat.initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 text-base">{chat.flag}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-sm text-foreground">{chat.name}</span>
                  {chat.time && <span className="text-xs text-muted-foreground">{chat.time}</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{chat.lastMsg}</p>
              </div>
              {chat.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">
                  {chat.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
export default ChatList;
