import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, MessageCircle, MapPin, Shield, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, Product } from "@/hooks/useProducts";

interface SellerInfo {
  name: string;
  country?: string | null;
  city?: string | null;
  rating?: number;
  verified?: boolean;
}

const flagFor = (country?: string | null) => (country === "Україна" ? "🇺🇦" : "🏳️");

const ShopDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { productsBySeller } = useProducts();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const [{ data: profile }, list] = await Promise.all([
        supabase.from("profiles").select("name, country, city, rating, verified").eq("id", id).maybeSingle(),
        productsBySeller(id),
      ]);
      if (!alive) return;
      setSeller((profile as SellerInfo) || null);
      setProducts(list);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const initials = (seller?.name || "??").slice(0, 2);

  return (
    <main className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Профіль продавця</h2>
      </div>

      {loading ? (
        <div className="px-4 mt-8 text-center text-sm text-muted-foreground">Завантаження…</div>
      ) : (
        <>
          <div className="px-4 pb-6 border-b border-border">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground">
                  {seller?.name || "Продавець"} {flagFor(seller?.country)}
                </h3>
                {(seller?.city || seller?.country) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="w-3 h-3" strokeWidth={1.75} />{" "}
                    {[seller?.city, seller?.country].filter(Boolean).join(", ")}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-warning text-warning" strokeWidth={1.75} />
                    {(seller?.rating ?? 0).toFixed(1)}
                  </span>
                  <span>{products.length} товарів</span>
                  {seller?.verified && (
                    <span className="flex items-center gap-1 text-success">
                      <Shield className="w-3 h-3" strokeWidth={1.75} />
                      Верифіковано
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
              onClick={() => {
                void tap("light");
                navigate("/app/chats");
              }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.75} /> Написати продавцю
            </Button>
          </div>

          <div className="px-4 pt-4">
            <h3 className="font-semibold text-foreground mb-3">Товари продавця ({products.length})</h3>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Поки що немає товарів</p>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      void tap("light");
                      navigate(`/app/shop/${p.id}`);
                    }}
                    className="w-full relative flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-secondary/50 hover:-translate-y-px transition-all duration-150 text-left overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package
                          className="w-6 h-6 text-muted-foreground/40"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.category || "Товар"}</p>
                    </div>
                    <p className="font-bold text-foreground">€{(p.price_cents / 100).toFixed(0)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
};
export default ShopDetail;
