import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Send, Users, Radio } from "lucide-react";

const initMessages = [
  { id:1, user:"Марія Л.", text:"Тримайтесь! 🙏", isDonation:false },
  { id:2, user:"Anonymous", text:"Надіслала €20 на підтримку", isDonation:true },
  { id:3, user:"Юрій Т.", text:"Слава Україні!", isDonation:false },
  { id:4, user:"BridoConnect", text:"Ахмад надіслав €50! 💙", isDonation:true },
];

const StreamViewer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [liked, setLiked] = useState(false);
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState(initMessages);

  const sendMsg = () => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { id:Date.now(), user:"Ви", text:msg.trim(), isDonation:false }]);
    setMsg("");
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      <div className="relative bg-black" style={{height:"55vh"}}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Radio className="w-20 h-20 text-white/10" />
        </div>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-10">
          <button onClick={() => navigate(-1)} className="p-2 bg-black/40 rounded-full">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-red-500 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
              <span className="text-white text-xs font-bold">LIVE</span>
            </div>
            <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full">
              <Users className="w-3 h-3 text-white"/>
              <span className="text-white text-xs">234</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <div className="bg-black/70 rounded-xl p-3 mb-2">
            <p className="text-white font-semibold text-sm">Оксана К. 🇺🇦</p>
            <p className="text-white/60 text-xs">Збір на ремонт будинку · Ціль: €3 200</p>
            <div className="mt-2 w-full h-1.5 bg-white/20 rounded-full">
              <div className="h-full bg-accent rounded-full" style={{width:"65%"}}/>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-white/60">Зібрано</span>
              <span className="text-white font-semibold">€2 080 / €3 200</span>
            </div>
          </div>
          <div className="flex gap-2">
            {["€5","€10","€20","€50"].map(amt=>(
              <button key={amt} className="flex-1 py-2 bg-accent rounded-xl text-white text-xs font-bold">{amt}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground">Чат</span>
          <button onClick={() => setLiked(l=>!l)}>
            <Heart className={`w-5 h-5 ${liked?"fill-accent text-accent":"text-muted-foreground"}`}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {messages.map(m=>(
            <div key={m.id} className={`text-xs ${m.isDonation?"text-accent font-semibold":""}`}>
              <span className="font-medium text-foreground">{m.user}: </span>
              <span className="text-muted-foreground">{m.text}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()}
            placeholder="Написати в чаті..."
            className="flex-1 bg-secondary rounded-xl px-3 py-2 text-xs outline-none text-foreground placeholder:text-muted-foreground"/>
          <button onClick={sendMsg} className="p-2 bg-accent rounded-xl">
            <Send className="w-4 h-4 text-white"/>
          </button>
        </div>
      </div>
    </div>
  );
};
export default StreamViewer;
