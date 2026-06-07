import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Search, CheckCircle2, Star } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { tap, notify } from "@/lib/native";

const Wishlist = () => {
  const navigate = useNavigate();
  const { favorites, loading, removeFavorite } = useFavorites();

  const handleRemove = async (targetId: string) => {
    void tap("medium");
    const { error } = await removeFavorite(targetId);
    if (!error) {
      void notify("success");
      toast({ title: "Видалено з обраних" });
    } else {
      void notify("error");
      toast({ title: "Помилка", description: error.message, variant: "destructive" });
    }
  };

  // useFavorites doesn't expose refetch; PullToRefresh is wired to a no-op until hook adds it.
  const refetch = async () => { void tap("light"); };

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">Обрані</h1>
        <button
          onClick={() => { void tap("light"); navigate("/app/search"); }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
          aria-label="Пошук"
        >
          <Search className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>

      {loading && (
        <div className="px-4 mt-3 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            {/* SVG heart per DESIGN.md §States */}
            <svg viewBox="0 0 48 48" className="w-10 h-10 text-accent" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M24 40C16 33 6 27 6 17a8 8 0 0 1 14-5l4 4 4-4a8 8 0 0 1 14 5c0 10-10 16-18 23z" />
            </svg>
          </div>
          <p className="font-semibold text-foreground mb-2">Список порожній</p>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Додавайте людей в обрані щоб швидко знаходити<br />їх і допомагати.
          </p>
          <button
            onClick={() => { void tap("light"); navigate("/app/search"); }}
            className="text-sm text-accent font-semibold min-h-[44px] px-3"
          >
            Знайти людей →
          </button>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <PullToRefresh onRefresh={refetch}>
          <div className="px-4 mt-3 space-y-3">
            {favorites.map((person) => {
              const initials = (person.target_name || "?")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const flag = person.target_country === "Україна" ? "🇺🇦" : "🏳️";

              return (
                <article
                  key={person.id}
                  className="relative flex items-center gap-3 p-4 rounded-2xl border border-border overflow-hidden transition-all duration-150 hover:-translate-y-px hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
                >
                  <button
                    className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0 overflow-hidden"
                    onClick={() => { void tap("light"); navigate(`/app/user/${person.target_id}`); }}
                    aria-label={person.target_name}
                  >
                    {person.target_avatar ? (
                      <img src={person.target_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </button>
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => { void tap("light"); navigate(`/app/user/${person.target_id}`); }}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {person.target_name}
                      </p>
                      {person.target_verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      {flag} {person.target_city} ·
                      <Star className="w-3 h-3 fill-warning text-warning" strokeWidth={1.75} />
                      {(person.target_rating || 0).toFixed(1)} · {person.target_deals_count || 0} угод
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { void tap("light"); navigate(`/app/user/${person.target_id}`); }}
                      className="min-h-[44px] min-w-[44px] bg-secondary rounded-2xl flex items-center justify-center transition-transform duration-150 hover:-translate-y-px"
                      aria-label="Написати"
                    >
                      <MessageCircle className="w-4 h-4 text-foreground" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => handleRemove(person.target_id)}
                      className="min-h-[44px] min-w-[44px] bg-accent/10 rounded-2xl flex items-center justify-center transition-transform duration-150 hover:-translate-y-px"
                      aria-label="Видалити з обраних"
                    >
                      <Heart className="w-4 h-4 text-accent fill-accent" strokeWidth={1.75} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </PullToRefresh>
      )}
    </div>
  );
};

export default Wishlist;
