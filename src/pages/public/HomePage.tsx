import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shield, Eye, Users, Lock, CheckCircle, Plus } from "lucide-react";

const slides = ["hero","how","recipients","transparency","cta"];
const recipients = [
  { name:"Оксана К.", flag:"🇺🇦", city:"Харків", need:"Відновлення житла", bio:"Будинок пошкоджений. Дві доньки. Потрібна допомога з ремонтом.", goal:3200, raised:1840, rating:4.9, deals:17 },
  { name:"Аміна Х.", flag:"🇸🇾", city:"Алеппо", need:"Протез ноги", bio:"Втратила ногу. Хоче повернутись до роботи вчителькою.", goal:3200, raised:2304, rating:5.0, deals:9 },
  { name:"Фатіма А.", flag:"🇦🇫", city:"Кабул", need:"Освіта для дівчат", bio:"Організовує підпільні уроки. Потрібні підручники.", goal:1400, raised:1232, rating:4.8, deals:23 },
  { name:"Ахмед М.", flag:"🇸🇾", city:"Дамаск", need:"Ліки та їжа", bio:"Батько трьох дітей. Потребує базової підтримки.", goal:2400, raised:960, rating:4.7, deals:5 },
  { name:"Надія Р.", flag:"🇺🇦", city:"Миколаїв", need:"Генератор", bio:"Медсестра. Потрібне автономне живлення для обладнання.", goal:800, raised:340, rating:4.9, deals:4 },
  { name:"Карім О.", flag:"🇸🇩", city:"Хартум", need:"Їжа та вода", bio:"Доглядає за батьками в зоні конфлікту.", goal:600, raised:180, rating:4.6, deals:3 },
];

export default function HomePage() {
  const [slide, setSlide] = useState(0);
  const [ri, setRi] = useState(0);
  const next = useCallback(()=>setSlide(p=>(p+1)%5),[]);
  const prev = useCallback(()=>setSlide(p=>(p-1+5)%5),[]);
  useEffect(()=>{const f=(e:KeyboardEvent)=>{if(e.key==="ArrowRight")next();if(e.key==="ArrowLeft")prev()};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f)},[next,prev]);
  const r=recipients[ri]; const pct=Math.round(r.raised/r.goal*100);

  return (
    <div className="relative overflow-hidden" style={{height:"calc(100vh - 64px)"}}>
      <div className="flex h-full transition-transform duration-500 ease-in-out" style={{transform:`translateX(-${slide*100}%)`,width:`${5*100}%`}}>

        {/* СЛАЙД 1: HERO */}
        <div className="flex-shrink-0 h-full" style={{width:"20%"}}>
          <div className="h-full flex items-center relative overflow-hidden" style={{background:"linear-gradient(135deg,#0f3460,#16213e,#060f20)"}}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-red-500"/>
            <div className="relative z-10 max-w-5xl mx-auto px-8 w-full grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs text-white/70 font-medium" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)"}}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"/>Зараз 0 прямих ефірів · Платформа запускається
                </div>
                <h1 className="font-serif text-5xl text-white leading-tight mb-5">Допомога від людини —<br/><em className="not-italic" style={{color:"#e94560"}}>людині</em></h1>
                <p className="text-base text-white/60 leading-relaxed mb-8 max-w-md">Обери верифіковану людину і допоможи напряму. Без анонімних фондів. Без посередників. Ти бачиш результат.</p>
                <div className="flex flex-wrap gap-3 mb-10">
                  <Link to="/register" className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white" style={{background:"#e94560"}}>Почати допомагати →</Link>
                  <Link to="/register?role=executor" className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white/80" style={{border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.05)"}}>Мені потрібна допомога</Link>
                </div>
                <div className="flex gap-8 pt-6" style={{borderTop:"1px solid rgba(255,255,255,0.1)"}}>
                  {[["0","ефірів зараз"],["5%","комісія"],["24 год","верифікація"]].map(([v,l])=>(
                    <div key={l}><div className="text-xl font-bold text-white">{v}</div><div className="text-xs text-white/35 uppercase tracking-wider">{l}</div></div>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block rounded-2xl overflow-hidden" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)"}}>
                <div className="px-4 py-3 flex items-center justify-between" style={{borderBottom:"1px solid rgba(255,255,255,0.08)",background:"rgba(0,0,0,0.2)"}}>
                  <span className="text-xs text-white/50 uppercase tracking-widest">Приклад профілю</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{background:"rgba(29,138,90,0.2)",color:"#4ade80"}}>✓ Верифіковано</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{background:"rgba(255,255,255,0.1)"}}>🇺🇦</div>
                    <div><div className="font-semibold text-white text-sm">Оксана К.</div><div className="text-xs text-white/40">Харків · ⭐ 4.9 · 17 угод</div></div>
                  </div>
                  <p className="text-sm text-white/60 mb-4 leading-relaxed">«Відновлення житла після обстрілу. Двоє дітей. Потрібна допомога з ремонтом даху.»</p>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5"><span className="text-white/50">€1 840 зібрано</span><span className="text-white/30">з €3 200</span></div>
                    <div className="h-1.5 rounded-full" style={{background:"rgba(255,255,255,0.1)"}}><div className="h-full rounded-full" style={{width:"57%",background:"#e94560"}}/></div>
                  </div>
                  <Link to="/register" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:"#e94560"}}><Plus className="w-3.5 h-3.5"/>Допомогти</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* СЛАЙД 2: ЯК ЦЕ ПРАЦЮЄ */}
        <div className="flex-shrink-0 h-full bg-background" style={{width:"20%"}}>
          <div className="h-full flex items-center">
            <div className="max-w-5xl mx-auto px-8 w-full">
              <div className="text-center mb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3">Як це працює</span>
                <h2 className="font-serif text-4xl text-foreground">Три кроки до <em className="not-italic text-accent">реальної допомоги</em></h2>
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                {[
                  {n:"01",icon:Users,t:"Знайди людину",d:"Переглянь профілі верифікованих отримувачів. Читай реальні історії та рейтинг. Обирай сам.",tag:"Лише верифіковані"},
                  {n:"02",icon:CheckCircle,t:"Обери формат",d:"Переведи гроші, купи товар зі списку або постав завдання. 95% суми доходить до людини.",tag:"95% отримувачу"},
                  {n:"03",icon:Eye,t:"Отримай підтвердження",d:"Фото і відео після виконання. Escrow захищає тебе — гроші тільки після підтвердження.",tag:"Прозоро і публічно"},
                ].map(s=>(
                  <div key={s.n} className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:"rgba(233,69,96,0.1)"}}><s.icon className="w-5 h-5 text-accent"/></div>
                      <span className="font-serif text-3xl text-accent/20 font-bold">{s.n}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">{s.t}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.d}</p>
                    <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full" style={{background:"rgba(233,69,96,0.08)",color:"#e94560"}}>{s.tag}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8"><Link to="/how-it-works" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">Детальніше про процес →</Link></div>
            </div>
          </div>
        </div>

        {/* СЛАЙД 3: ОТРИМУВАЧІ */}
        <div className="flex-shrink-0 h-full bg-secondary" style={{width:"20%"}}>
          <div className="h-full flex items-center">
            <div className="max-w-5xl mx-auto px-8 w-full">
              <div className="text-center mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3">Реальні люди</span>
                <h2 className="font-serif text-4xl text-foreground">Тобі можуть <em className="not-italic text-accent">допомогти</em></h2>
              </div>
              <div className="grid lg:grid-cols-2 gap-6 items-start">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="h-36 flex items-center justify-center relative" style={{background:"linear-gradient(135deg,rgba(15,52,96,0.7),rgba(15,52,96,0.9)"}}>
                    <span className="text-6xl opacity-30">{r.flag}</span>
                    <div className="absolute bottom-3 left-3"><span className="text-xs px-2.5 py-1 rounded-full font-medium text-white" style={{background:"rgba(29,138,90,0.9)"}}>✓ Верифіковано</span></div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div><h3 className="font-bold text-foreground text-lg">{r.name} {r.flag}</h3><p className="text-xs text-muted-foreground">{r.city}</p></div>
                      <div className="text-right"><div className="text-xs font-medium">⭐ {r.rating}</div><div className="text-xs text-muted-foreground">{r.deals} угод</div></div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2 text-accent">{r.need}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{r.bio}</p>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5"><span className="font-semibold">€{r.raised.toLocaleString()}</span><span className="text-muted-foreground">з €{r.goal.toLocaleString()}</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-accent" style={{width:`${pct}%`}}/></div>
                    </div>
                    <Link to="/register" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:"#e94560"}}><Plus className="w-3.5 h-3.5"/>Допомогти {r.name.split(" ")[0]}</Link>
                  </div>
                </div>
                <div className="space-y-2">
                  {recipients.map((rec,i)=>(
                    <button key={rec.name} onClick={()=>setRi(i)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${i===ri?"border-accent bg-accent/5":"border-border bg-card hover:border-accent/40"}`}>
                      <span className="text-2xl">{rec.flag}</span>
                      <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{rec.name} · {rec.city}</div><div className="text-xs text-muted-foreground truncate">{rec.need}</div></div>
                      <div className="text-xs text-muted-foreground">{Math.round(rec.raised/rec.goal*100)}%</div>
                    </button>
                  ))}
                  <Link to="/register?role=executor" className="w-full flex items-center justify-center py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors mt-2">Зареєструватись і опублікувати профіль →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* СЛАЙД 4: ПРОЗОРІСТЬ */}
        <div className="flex-shrink-0 h-full bg-background" style={{width:"20%"}}>
          <div className="h-full flex items-center">
            <div className="max-w-5xl mx-auto px-8 w-full">
              <div className="text-center mb-10">
                <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-3">Безпека і прозорість</span>
                <h2 className="font-serif text-4xl text-foreground">Кожен цент <em className="not-italic text-accent">на виду</em></h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {[
                  {icon:Shield,n:"100%",l:"Верифіковані",d:"Кожен отримувач проходить перевірку документів. Жодного анонімного профілю."},
                  {icon:Lock,n:"AES-256",l:"Шифрування",d:"Дані зашифровані. Сервери в Німеччині (AWS Frankfurt). Повна відповідність GDPR."},
                  {icon:Eye,n:"98%",l:"Доходить",d:"98% угод завершуються успішно. Публічна історія кожної транзакції."},
                  {icon:CheckCircle,n:"5%",l:"Комісія",d:"Лише 5% від суми. Покриває верифікацію, escrow і безпеку платежів."},
                ].map(p=>(
                  <div key={p.n} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{background:"rgba(233,69,96,0.1)"}}><p.icon className="w-5 h-5 text-accent" strokeWidth={1.5}/></div>
                    <div className="text-2xl font-bold text-foreground">{p.n}</div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5 mb-3">{p.l}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.d}</p>
                  </div>
                ))}
              </div>
              <div className="bg-secondary rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-center mb-4">Як працює Escrow-захист</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[["1","Спонсор платить","Гроші заморожені"],["2","Виконавець стартує","Підтверджує задачу"],["3","Звіт з доказами","Фото або відео"],["4","Виплата 95%","Після підтвердження"]].map(([n,t,s])=>(
                    <div key={n} className="text-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-accent mx-auto mb-2" style={{background:"rgba(233,69,96,0.15)"}}>{n}</div>
                      <div className="text-xs font-semibold mb-1">{t}</div><div className="text-xs text-muted-foreground">{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center mt-6"><Link to="/transparency" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">Детальніше →</Link></div>
            </div>
          </div>
        </div>

        {/* СЛАЙД 5: CTA */}
        <div className="flex-shrink-0 h-full" style={{width:"20%",background:"#16213e"}}>
          <div className="h-full flex items-center">
            <div className="max-w-3xl mx-auto px-8 w-full text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-accent block mb-6">Приєднуйся</span>
              <h2 className="font-serif text-5xl text-white mb-6 leading-tight">Один крок —<br/>і чиєсь життя <em className="not-italic" style={{color:"#e94560"}}>зміниться</em></h2>
              <p className="text-white/55 text-base mb-10 max-w-md mx-auto leading-relaxed">Реєстрація — 2 хвилини. Верифікація — до 24 годин. Перша допомога — одразу після входу.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Link to="/register" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg" style={{background:"#e94560"}}><Plus className="w-5 h-5"/>Зареєструватись</Link>
                <Link to="/register?role=executor" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white text-lg" style={{border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)"}}>Мені потрібна допомога</Link>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
                {["✓ 100% верифіковані","✓ Escrow-захист","✓ Сервери в Німеччині","✓ GDPR"].map(f=><span key={f}>{f}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Навігація */}
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-background/80 border border-border hover:bg-background transition-colors"><ChevronLeft className="w-4 h-4"/></button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-background/80 border border-border hover:bg-background transition-colors"><ChevronRight className="w-4 h-4"/></button>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        {slides.map((_,i)=><button key={i} onClick={()=>setSlide(i)} className={`rounded-full transition-all duration-300 ${i===slide?"w-6 h-2 bg-accent":"w-2 h-2 bg-foreground/20 hover:bg-foreground/40"}`}/>)}
      </div>
      <div className="absolute top-4 right-12 text-xs font-mono text-foreground/30 z-20">{slide+1} / 5</div>
    </div>
  );
}
