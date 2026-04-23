import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Search } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "@/hooks/use-toast";

const Wishlist = () => {
  const navigate = useNavigate();
  const { favorites, loading, removeFavorite } = useFavorites();

  const handleRemove = async (targetId: string) => {
    const { error } = await removeFavorite(targetId);
    if (!error) toast({ title: "Видалено з обраних" });
    else toast({ title: "Помилка", description: error.message, variant: "destructive" });
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Обрані</h2>
        <button
          onClick={() => navigate("/app/search")}
          className="p-2 text-muted-foreground"
          aria-label="Пошук"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <p className="font-semibold text-foreground mb-2">Список порожній</p>
          <p className="text-sm text-muted-foreground mb-4">
            Додавайте людей в обрані щоб швидко знаходити їх і допомагати.
          </p>
          <button
            onClick={() => navigate("/app/search")}
            className="text-sm text-accent font-semibold"
          >
            Знайти людей →
          </button>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div className="px-4 space-y-3">
          {favorites.map(person => {
            const initials = (person.target_name || "?")
              .split(" ")
              .map(n => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const flag = person.target_country === "Україна" ? "🇺🇦" : "🏳️";

            return (
              <div
                key={person.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-border"
              >
                <button
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0 overflow-hidden"
                  onClick={() => navigate(`/app/user/${person.target_id}`)}
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
                  onClick={() => navigate(`/app/user/${person.target_id}`)}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {person.target_name}
                    </p>
                    {person.target_verified && <span className="text-xs text-accent">✓</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {flag} {person.target_city} · ⭐ {(person.target_rating || 0).toFixed(1)} ·{" "}
                    {person.target_deals_count || 0} угод
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/app/user/${person.target_id}`)}
                    className="p-2 bg-secondary rounded-xl"
                    aria-label="Написати"
                  >
                    <MessageCircle className="w-4 h-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => handleRemove(person.target_id)}
                    className="p-2 bg-accent/10 rounded-xl"
                    aria-label="Видалити з обраних"
                  >
                    <Heart className="w-4 h-4 text-accent fill-accent" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
