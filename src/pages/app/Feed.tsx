import { useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Radio, Plus, Heart } from "lucide-react";
const countries = ["Всі","🇺🇦","🇸🇾","🇵🇸","🇦🇫","🇸🇩"];
const types = ["Всі","Гроші","Товари","Завдання"];
const executors = [
  {id:"1",name:"Оксана К.",country:"🇺🇦",city:"Харків",verified:true,urgent:true,live:false,bio:"Мама двох дітей. Будинок зруйновано обстрілом. Потрібна допомога для відновлення житла.",type:"Гроші",progress:65,goal:3200,raised:2080,rating:4.8,deals:12},
  {id:"2",name:"Ахмед М.",country:"🇸🇾",city:"Алеппо",verified:true,urgent:false,live:false,bio:"Втратив ногу під час війни. Збирає кошти на протез. Вчитель у таборі біженців.",type:"Товари",progress:42,goal:5500,raised:2310,rating:4.9,deals:8},
  {id:"3",name:"Фатіма А.",country:"🇦🇫",city:"Кабул",verified:true,urgent:false,live:true,bio:"Допомагає дівчатам здобути освіту. Організовує підпільні заняття після заборони.",type:"Завдання",progress:88,goal:1400,raised:1232,rating:5.0,deals:23},
  {id:"4",name:"Надія Р.",country:"🇺🇦",city:"Миколаїв",verified:true,urgent:true,live:false,bio:"Медична сестра. Потрібен генератор для роботи медичного обладнання в лікарні.",type:"Гроші",progress:43,goal:800,raised:340,rating:4.9,deals:4},
  {id:"5",name:"Карім О.",country:"🇸🇩",city:"Хартум",verified:true,urgent:false,live:false,bio:"Доглядає за батьками в зоні конфлікту. Потрібна базова підтримка харчами та ліками.",type:"Гроші",progress:30,goal:600,raised:180,rating:4.6,deals:3},
];
export default function Feed() {
  const [country, setCountry] = useState("Всі");
  const [type, setType] = useState("Всі");
  const filtered = executors.filter(e => (country==="Всі" || e.country===country) && (type==="Всі" || e.type===type));
  return (
    <div>
      <div className="px-4 pt-4 pb-3 border-b border-border sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-serif text-xl text-foreground">Стрічка</h1>
          <Link to="/app/search" className="p-2 text-muted-foreground"><Filter className="w-5 h-5"/></Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {countries.map(c => <button key={c} onClick={()=>setCountry(c)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${country===c?"bg-accent text-white":"bg-secondary text-muted-foreground"}`}>{c}</button>)}
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {types.map(t => <button key={t} onClick={()=>setType(t)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${type===t?"bg-foreground text-background":"bg-secondary text-muted-foreground"}`}>{t}</button>)}
        </div>
      </div>
      <div className="px-4 py-4 space-y-4">
        {filtered.map(e => (
          <Link key={e.id} to={`/app/user/${e.id}`} className="block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-24 flex items-center justify-center text-5xl relative" style={{background:"linear-gradient(135deg,#0f3460,#16213e)"}}>
              <span className="opacity-40">{e.country}</span>
              <div className="absolute top-3 left-3 flex gap-2">
                {e.verified && <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{background:"rgba(29,138,90,0.9)"}}>✓ Верифіковано</span>}
                {e.urgent && <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white bg-destructive">🔴 Терміново</span>}
                {e.live && <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white bg-accent flex items-center gap-1"><Radio className="w-3 h-3"/>LIVE</span>}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-semibold text-foreground">{e.name} {e.country}</h3><p className="text-xs text-muted-foreground">{e.city} · ⭐ {e.rating} · {e.deals} угод</p></div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-secondary text-muted-foreground">{e.type}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{e.bio}</p>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-foreground">€{e.raised.toLocaleString()}</span><span className="text-muted-foreground">з €{e.goal.toLocaleString()} · {e.progress}%</span></div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-accent rounded-full" style={{width:`${e.progress}%`}}/></div>
              </div>
              <div className="flex gap-2">
                <button onClick={ev=>{ev.preventDefault();}} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold"><Heart className="w-4 h-4"/>Донат</button>
                <button onClick={ev=>{ev.preventDefault();}} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-sm font-medium"><Plus className="w-4 h-4"/>Угода</button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
