import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, MoreVertical } from "lucide-react";

const initMessages = [
  { id: 1, from: "them", text: "Добрий день! Дякую, що відгукнулись.", time: "14:10" },
  { id: 2, from: "me", text: "Привіт! Звісно, бачу ваш запит. Яка ситуація зараз?", time: "14:12" },
  { id: 3, from: "them", text: "Будинок пошкоджений після обстрілу. Нам потрібна допомога з тимчасовим житлом для двох дітей.", time: "14:14" },
  { id: 4, from: "me", text: "Розумію. Я можу допомогти з частиною витрат. Скільки потрібно орієнтовно?", time: "14:15" },
  { id: 5, from: "them", text: "Оренда коштує €800 на місяць. Будь-яка сума допоможе 🙏", time: "14:17" },
];

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [messages, setMessages] = useState(initMessages);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), from: "me", text: input.trim(), time: new Date().toLocaleTimeString("uk", {hour:"2-digit",minute:"2-digit"}) }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">ОК</div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">Оксана К. 🇺🇦</p>
          <p className="text-xs text-success">онлайн</p>
        </div>
        <button onClick={() => navigate(`/app/deal/${id}`)} className="text-xs bg-accent text-white px-3 py-1.5 rounded-lg font-medium">Угода</button>
        <button><MoreVertical className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-secondary/20">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.from === "me" ? "bg-primary text-white rounded-tr-sm" : "bg-background text-foreground rounded-tl-sm shadow-sm"}`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background">
        <button className="p-2 text-muted-foreground"><Paperclip className="w-5 h-5" /></button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Повідомлення..."
          className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
        <button onClick={send} className="p-2 bg-accent rounded-xl text-white">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
export default Chat;
