import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="mb-6">
        <p className="text-8xl font-serif font-bold text-foreground/10">404</p>
        <p className="text-2xl font-serif text-foreground mt-2">Сторінку не знайдено</p>
        <p className="text-muted-foreground text-sm mt-2">Можливо, посилання застаріло або сторінки більше не існує.</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Назад
        </Button>
        <Button className="bg-accent hover:bg-accent/90 text-white gap-2" onClick={() => navigate("/")}>
          <Home className="w-4 h-4" /> На головну
        </Button>
      </div>
    </div>
  );
};
export default NotFound;
