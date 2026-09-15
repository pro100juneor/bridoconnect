import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, MapPin, X, ShoppingBag, BadgeCheck } from "lucide-react";
import {
  useRecipientPage,
  isVisible,
  type RecipientPageData,
  type WishlistItem,
} from "@/hooks/useRecipientPage";
import { useCurrency } from "@/hooks/useCurrency";
import { useT } from "@/i18n/useT";

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
  const { t } = useT();
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
          <p className="text-sm font-semibold text-accent mt-1">
            {convert(p.price_cents, p.currency).formatted}
          </p>
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
        <p className="text-sm font-medium text-foreground line-clamp-2">
          {item.title || t("recipient.wish.fallbackTitle", "Побажання")}
        </p>
        {item.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.note}</p>}
      </div>
    </div>
  );
};

export default function RecipientPage() {
  const { slug } = useParams();
  const { getBySlug } = useRecipientPage();
  const { t, localeTag } = useT();

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
    if (data?.profile) {
      document.title = t("recipient.docTitle", "{name} — сторінка отримувача", {
        name: data.profile.name,
      });
    }
  }, [data, t]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t("recipient.loading", "Завантаження сторінки…")}</p>
      </div>
    );
  }

  if (state === "notfound" || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-serif text-3xl text-foreground">{t("notfound.title", "Сторінку не знайдено")}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("recipient.notFound.desc", "Сторінка за адресою «{slug}» не існує або була прихована.", {
            slug: slug ?? "",
          })}
        </p>
        <Link to="/" className="mt-2 text-sm font-medium text-accent underline underline-offset-4">
          {t("notfound.home", "На головну")}
        </Link>
      </div>
    );
  }

  if (state === "closed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="font-serif text-3xl text-foreground">
          {t("recipient.closed.title", "Сторінка прихована")}
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("recipient.closed.desc", "{name} тимчасово закрив(ла) свою публічну сторінку.", {
            name: data.profile.name,
          })}
        </p>
        <Link to="/" className="mt-2 text-sm font-medium text-accent underline underline-offset-4">
          {t("notfound.home", "На головну")}
        </Link>
      </div>
    );
  }

  const { profile, photos, posts, wishlist } = data;
  const fv = profile.field_visibility;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");
  const isVerified = profile.verification_status === "verified";

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
            <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-foreground flex items-center gap-1.5 min-w-0">
              <span className="truncate">{profile.name}</span>
              {isVerified && (
                <span
                  className="inline-flex items-center shrink-0 text-accent"
                  title={t("shop.verified", "Верифіковано")}
                  aria-label={t("shop.verified", "Верифіковано")}
                >
                  <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />
                </span>
              )}
            </h1>
            {isVisible(fv, "location") && location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} /> {location}
              </p>
            )}
          </div>
          <Link
            to={`/app/user/${profile.id}`}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2.5 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          >
            <Heart className="w-4 h-4" strokeWidth={1.75} /> {t("deal.support.cta", "Підтримати")}
          </Link>
        </div>

        {isVisible(fv, "bio") && profile.bio && (
          <p className="text-sm text-foreground/90 leading-relaxed mb-8 max-w-2xl">{profile.bio}</p>
        )}

        {/* Wishlist */}
        {isVisible(fv, "wishlist") && (
          <section className="mb-10">
            <h2 className="font-serif text-xl text-foreground mb-3">
              {t("recipient.wishlist.title", "Що потрібно")}
            </h2>
            {wishlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {wishlist.map((item) => (
                  <WishlistCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t("recipient.wishlist.empty", "Список побажань поки порожній.")}
              </p>
            )}
          </section>
        )}

        {/* Photo gallery */}
        {isVisible(fv, "photos") && photos.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif text-xl text-foreground mb-3">
              {t("recipient.photos.title", "Фотографії")}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((ph) => (
                <button
                  key={ph.id}
                  onClick={() => setLightbox(ph.url)}
                  className="aspect-square rounded-xl overflow-hidden bg-secondary hover:-translate-y-px transition-transform duration-150"
                  aria-label={t("recipient.photos.openAria", "Відкрити фото")}
                >
                  <img src={ph.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Wall */}
        {isVisible(fv, "wall") && (
          <section>
            <h2 className="font-serif text-xl text-foreground mb-3">{t("recipient.wall.title", "Стіна")}</h2>
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="relative rounded-2xl border border-border p-4 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
                  >
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(post.created_at).toLocaleDateString(localeTag, {
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
                            aria-label={t("recipient.wall.openImageAria", "Відкрити зображення")}
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
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t("recipient.wall.empty", "Записів поки немає.")}
              </p>
            )}
          </section>
        )}
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
            aria-label={t("common.close", "Закрити")}
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
