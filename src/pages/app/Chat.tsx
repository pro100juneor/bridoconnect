import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, MoreVertical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";

const MOCK_MSGS = [
  { id:"1", sender_id:"them", text:"Добрий день! Дякую, що відгукнулись.", created_at: new Date().toISOString() },
  { id:"2", sender_id:"me", text:"Привіт! Звісно, бачу ваш запит. Яка ситуація зараз?", created_at: new Date().toISOString() },
  { id:"3", sender_id:"them", text:"Будинок пошкоджений після обстрілу. Нам потрібна допомога з тимчасовим житлом.", created_at: new Date().toISOString() },
];

const Chat = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { messages: realMessages, sendMessage } = useMessages(id || "");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = realMessages.length > 0 ? realMessages : MOCK_MSGS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !user || !id) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text, user.id);
  };

  return (
    <div className="flex flex-col h-screen">
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

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-secondary/20">
        {(messages as any[]).map(msg => {
          const isMe = msg.sender_id === user?.id || msg.sender_id === "me";
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-background text-foreground rounded-tl-sm shadow-sm"}`}>
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("uk", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background">
        <button className="p-2 text-muted-foreground"><Paperclip className="w-5 h-5" /></button>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Повідомлення..."
          className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground" />
        <button onClick={send} className="p-2 bg-accent rounded-xl text-white">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
export default Chat;
