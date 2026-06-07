import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      {/* SVG compass illustration per DESIGN.md §States */}
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
        <svg viewBox="0 0 48 48" className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="24" cy="24" r="18" />
          <path d="M30 18l-3 9-9 3 3-9 9-3z" />
          <circle cx="24" cy="24" r="1.5" fill="currentColor" />
        </svg>
      </div>
      <div className="mb-6">
        <p className="text-8xl font-serif font-bold text-foreground/10 animate-fade-in">404</p>
        <h1 className="text-4xl font-serif tracking-tight text-foreground mt-2 animate-fade-in">Сторінку не знайдено</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Можливо, посилання застаріло або сторінки більше не існує.
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Назад
        </Button>
        <Button
          className="bg-accent hover:bg-accent/90 text-white gap-2 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          onClick={() => navigate("/")}
        >
          <Home className="w-4 h-4" strokeWidth={1.75} /> На головну
        </Button>
      </div>
    </main>
  );
};
export default NotFound;
