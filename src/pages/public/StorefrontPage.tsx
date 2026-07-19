import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useShopProfile } from "@/hooks/useShopProfile";
import { useProducts, type Product } from "@/hooks/useProducts";
import { getTheme } from "@/storefront/themes";
import Storefront from "@/storefront/Storefront";
import type { ShopProfile, SellerSummary } from "@/storefront/types";

type LoadState = "loading" | "notfound" | "ready";

export default function StorefrontPage() {
  const { slug } = useParams();
  const { getBySlug } = useShopProfile();
  const { productsBySeller } = useProducts();

  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [seller, setSeller] = useState<SellerSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setState("loading");
      const p = await getBySlug(slug);
      if (!alive) return;
      if (!p) {
        setState("notfound");
        return;
      }
      const [{ data: sellerRow }, list] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, country, city, rating, verified")
          .eq("id", p.seller_id)
          .maybeSingle(),
        productsBySeller(p.seller_id),
      ]);
      if (!alive) return;
      setProfile(p);
      setSeller((sellerRow as SellerSummary) || null);
      setProducts(list);
      setState("ready");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (profile) {
      const name = profile.brand.name || seller?.name || "Магазин";
      document.title = `${name} — вітрина`;
    }
  }, [profile, seller]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Завантаження вітрини…</p>
      </div>
    );
  }

  if (state === "notfound" || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-serif text-3xl text-foreground">Вітрину не знайдено</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Магазин за адресою «{slug}» не існує або ще не опублікований.
        </p>
        <Link to="/shop" className="mt-2 text-sm font-medium text-accent underline underline-offset-4">
          Перейти до магазину
        </Link>
      </div>
    );
  }

  return (
    <Storefront profile={profile} theme={getTheme(profile.theme_id)} products={products} seller={seller} />
  );
}
