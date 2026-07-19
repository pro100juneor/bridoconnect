import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, MapPin, X, ShoppingBag } from "lucide-react";
import { useRecipientPage, type RecipientPageData, type WishlistItem } from "@/hooks/useRecipientPage";
import { useCurrency } from "@/hooks/useCurrency";

type LoadState = "loading" | "notfound" | "closed" | "ready";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const WishlistCard = ({ item }: { item: WishlistItem }) => {
  const { convert } = useCurrency();
  const p = item.product;

  if (p) {
    const img = p.images?.[0];
    return (
      <Link
        to={`/app/shop/${p.id}`}
        className="group relative flex flex-col rounded-2xl border border-border overflow-hidden hover:-translate-y-px transition-all duration-150 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8 before:z-10"
      >
        <div className="aspect-square bg-secondary overflow-hidden">
          {img ? (
            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
              <ShoppingBag className="w-8 h-8" strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-foreground line-clamp-2">{p.title}</p>
          <p className="text-sm font-semibold text-accent mt-1">{convert(p.price_cents).formatted}</p>
          {item.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.note}</p>}
        </div>
      </Link>
    );
  }

  // Free-form wish (no catalog product).
  return (
    <div className="relative flex flex-col rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
      <div className="aspect-square bg-secondary flex items-center justify-center text-muted-foreground/40">
        <Heart className="w-8 h-8" strokeWidth={1.5} />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-foreground line-clamp-2">{item.title || "Побажання"}</p>
        {item.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.note}</p>}
      </div>
    </div>
  );
};

export default function RecipientPage() {
  const { slug } = useParams();
  const { getBySlug } = useRecipientPage();

  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<RecipientPageData | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setState("loading");
      const d = await getBySlug(slug);
      if (!alive) return;
      if (!d) {
        setState("notfound");
        return;
      }
      if (!d.profile.public_page_enabled) {
        setData(d);
        setState("closed");
        return;
      }
      setData(d);
      setState("ready");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (data?.profile) document.title = `${data.profile.name} — сторінка отримувача`;
  }, [data]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Завантаження сторінки…</p>
      </div>
    );
  }

  if (state === "notfound" || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-serif text-3xl text-foreground">Сторінку не знайдено</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Сторінка за адресою «{slug}» не існує або була прихована.
        </p>
        <Link to="/" className="mt-2 text-sm font-medium text-accent underline underline-offset-4">
          На головну
        </Link>
      </div>
    );
  }

  if (state === "closed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-serif text-3xl text-foreground">Сторінка прихована</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {data.profile.name} тимчасово закрив(ла) свою публічну сторінку.
        </p>
        <Link to="/" className="mt-2 text-sm font-medium text-accent underline underline-offset-4">
          На головну
        </Link>
      </div>
    );
  }

  const { profile, photos, posts, wishlist } = data;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Cover */}
      <div className="relative h-44 sm:h-60 bg-secondary overflow-hidden">
        {profile.cover_url && <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Header: avatar + name + location + support CTA */}
        <div className="relative -mt-12 flex items-end gap-4 mb-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center text-3xl font-semibold text-primary overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initialsOf(profile.name)
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-foreground truncate">
              {profile.name}
            </h1>
            {location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} /> {location}
              </p>
            )}
          </div>
          <Link
            to={`/app/user/${profile.id}`}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2.5 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          >
            <Heart className="w-4 h-4" strokeWidth={1.75} /> Підтримати
          </Link>
        </div>

        {profile.bio && (
          <p className="text-sm text-foreground/90 leading-relaxed mb-8 max-w-2xl">{profile.bio}</p>
        )}

        {/* Wishlist */}
        <section className="mb-10">
          <h2 className="font-serif text-xl text-foreground mb-3">Що потрібно</h2>
          {wishlist.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {wishlist.map((item) => (
                <WishlistCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Список побажань поки порожній.</p>
          )}
        </section>

        {/* Photo gallery */}
        {photos.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-xl text-foreground mb-3">Фотографії</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((ph) => (
                <button
                  key={ph.id}
                  onClick={() => setLightbox(ph.url)}
                  className="aspect-square rounded-xl overflow-hidden bg-secondary hover:-translate-y-px transition-transform duration-150"
                  aria-label="Відкрити фото"
                >
                  <img src={ph.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Wall */}
        <section>
          <h2 className="font-serif text-xl text-foreground mb-3">Стіна</h2>
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="relative rounded-2xl border border-border p-4 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
                >
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(post.created_at).toLocaleDateString("uk", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.text}</p>
                  {post.media.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                      {post.media.map((m) => (
                        <button
                          key={m}
                          onClick={() => setLightbox(m)}
                          className="aspect-video rounded-xl overflow-hidden bg-secondary"
                          aria-label="Відкрити зображення"
                        >
                          <img src={m} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">Записів поки немає.</p>
          )}
        </section>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Закрити"
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
