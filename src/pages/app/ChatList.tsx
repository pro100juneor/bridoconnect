import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const chats = [
  { id: "1", name: "Оксана К.", flag: "🇺🇦", lastMsg: "Дякую за підтримку! Дуже допомогло", time: "14:32", unread: 2, avatar: "ОК" },
  { id: "2", name: "Ахмад Р.", flag: "🏳️", lastMsg: "Коли буде переказ?", time: "12:15", unread: 0, avatar: "АР" },
  { id: "3", name: "Марія Л.", flag: "🇺🇦", lastMsg: "Все отримала, дуже вдячна!", time: "Вчора", unread: 1, avatar: "МЛ" },
  { id: "4", name: "Fatima Al-Hassan", flag: "🏳️", lastMsg: "Thank you so much", time: "Вчора", unread: 0, avatar: "FA" },
  { id: "5", name: "Юрій Т.", flag: "🇺🇦", lastMsg: "Добре, чекатимемо підтвердження", time: "Пн", unread: 0, avatar: "ЮТ" },
];

const ChatList = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-serif text-xl text-foreground mb-3">Повідомлення</h2>
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input placeholder="Пошук чатів..." className="bg-transparent text-sm flex-1 outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {chats.map(chat => (
          <button key={chat.id} onClick={() => navigate(`/app/chat/${chat.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {chat.avatar}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 text-base">{chat.flag}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-sm text-foreground">{chat.name}</span>
                <span className="text-xs text-muted-foreground">{chat.time}</span>
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
    </div>
  );
};
export default ChatList;
