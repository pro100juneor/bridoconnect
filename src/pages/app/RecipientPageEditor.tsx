import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, X, ExternalLink, Trash2, Plus, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tap, notify } from "@/lib/native";
import { toast } from "@/hooks/use-toast";
import { useRecipientPage, type RecipientPageData } from "@/hooks/useRecipientPage";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";

const RecipientPageEditor = () => {
  const navigate = useNavigate();
  const {
    getMine,
    ensureSlug,
    setPageEnabled,
    uploadCover,
    addPhoto,
    deletePhoto,
    uploadMedia,
    addPost,
    deletePost,
    addWishlistProduct,
    addWishlistCustom,
    removeWishlist,
  } = useRecipientPage();
  const { listProducts } = useProducts();
  const { convert } = useCurrency();

  const [data, setData] = useState<RecipientPageData | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const coverInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const postMediaInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Wall composer
  const [postText, setPostText] = useState("");
  const [postMedia, setPostMedia] = useState<string[]>([]);

  // Wishlist
  const [customTitle, setCustomTitle] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const reload = async () => {
    const d = await getMine();
    setData(d);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await ensureSlug();
      if (!alive) return;
      if (res.slug) setSlug(res.slug);
      const d = await getMine();
      if (!alive) return;
      setData(d);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPicker = async () => {
    setPickerOpen(true);
    if (catalog.length === 0) {
      const list = await listProducts();
      setCatalog(list);
    }
  };

  const filtered = query.trim()
    ? catalog.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()))
    : catalog;

  // --- Cover / photos ---
  const onPickCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    const { error } = await uploadCover(file);
    setBusy(false);
    if (error) {
      void notify("error");
      toast({ title: "Обкладинка", description: error, variant: "destructive" });
      return;
    }
    void notify("success");
    await reload();
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      const { error } = await addPhoto(file);
      if (error) {
        void notify("error");
        toast({ title: "Фото", description: error, variant: "destructive" });
      }
    }
    setBusy(false);
    await reload();
  };

  const onDeletePhoto = async (id: string) => {
    void tap("light");
    await deletePhoto(id);
    await reload();
  };

  // --- Wall ---
  const onPickPostMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    for (const file of files) {
      const { url, error } = await uploadMedia(file);
      if (url) setPostMedia((m) => [...m, url]);
      else if (error) toast({ title: "Медіа", description: error, variant: "destructive" });
    }
    setBusy(false);
  };

  const submitPost = async () => {
    if (!postText.trim() || busy) return;
    void tap("medium");
    setBusy(true);
    const { error } = await addPost(postText.trim(), postMedia);
    setBusy(false);
    if (error) {
      void notify("error");
      toast({ title: "Пост", description: error, variant: "destructive" });
      return;
    }
    void notify("success");
    setPostText("");
    setPostMedia([]);
    await reload();
  };

  const onDeletePost = async (id: string) => {
    void tap("light");
    await deletePost(id);
    await reload();
  };

  // --- Wishlist ---
  const onAddProduct = async (productId: string) => {
    void tap("light");
    setBusy(true);
    const { error } = await addWishlistProduct(productId);
    setBusy(false);
    if (error) {
      toast({ title: "Список бажань", description: error, variant: "destructive" });
      return;
    }
    void notify("success");
    setPickerOpen(false);
    await reload();
  };

  const onAddCustom = async () => {
    if (!customTitle.trim() || busy) return;
    setBusy(true);
    const { error } = await addWishlistCustom(customTitle.trim(), customNote.trim() || undefined);
    setBusy(false);
    if (error) {
      toast({ title: "Побажання", description: error, variant: "destructive" });
      return;
    }
    void notify("success");
    setCustomTitle("");
    setCustomNote("");
    await reload();
  };

  const onRemoveWish = async (id: string) => {
    void tap("light");
    await removeWishlist(id);
    await reload();
  };

  const togglePublic = async () => {
    if (!data) return;
    void tap("light");
    const next = !data.profile.public_page_enabled;
    await setPageEnabled(next);
    await reload();
  };

  if (loading) {
    return (
      <main className="px-4 pt-4 pb-8 space-y-4">
        <div className="h-8 w-40 bg-secondary animate-pulse rounded" />
        <div className="h-32 bg-secondary animate-pulse rounded-2xl" />
        <div className="h-24 bg-secondary animate-pulse rounded-2xl" />
      </main>
    );
  }

  const profile = data?.profile;

  return (
    <main className="pb-16">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Моя публічна сторінка</h2>
      </div>

      <div className="px-4 space-y-6 mt-4">
        {/* Public link + toggle */}
        <div className="relative p-4 rounded-2xl border border-border overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Статус сторінки</p>
              <p
                className={`text-xs ${profile?.public_page_enabled ? "text-success" : "text-muted-foreground"}`}
              >
                {profile?.public_page_enabled ? "Опублікована" : "Прихована"}
              </p>
            </div>
            <Button variant="outline" onClick={togglePublic} className="shrink-0">
              {profile?.public_page_enabled ? "Приховати" : "Опублікувати"}
            </Button>
          </div>
          {slug && (
            <a
              href={`/u/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent underline underline-offset-4"
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.75} /> Відкрити мою публічну сторінку (/u/
              {slug})
            </a>
          )}
        </div>

        {/* Cover */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Обкладинка
          </label>
          <button
            onClick={() => {
              void tap("light");
              coverInput.current?.click();
            }}
            className="relative w-full h-32 rounded-2xl bg-secondary overflow-hidden flex items-center justify-center text-muted-foreground/50 transition-transform duration-150 hover:-translate-y-px"
          >
            {profile?.cover_url ? (
              <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="w-7 h-7" strokeWidth={1.75} />
            )}
          </button>
          <input ref={coverInput} type="file" accept="image/*" onChange={onPickCover} className="hidden" />
        </section>

        {/* Photos */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Фотографії
          </label>
          <div className="flex flex-wrap gap-2">
            {data?.photos.map((ph) => (
              <div key={ph.id} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-secondary">
                <img src={ph.url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => onDeletePhoto(ph.id)}
                  aria-label="Видалити фото"
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/50 rounded-full"
                >
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                void tap("light");
                photoInput.current?.click();
              }}
              aria-label="Додати фото"
              className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/50 transition-transform duration-150 hover:-translate-y-px"
            >
              <ImagePlus className="w-6 h-6" strokeWidth={1.75} />
            </button>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickPhoto}
            className="hidden"
          />
        </section>

        {/* Wall composer */}
        <section>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Стіна
          </label>
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="Поділіться новиною, подякою, історією…"
            rows={3}
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30 resize-none"
          />
          {postMedia.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {postMedia.map((m) => (
                <div key={m} className="relative w-16 h-16 rounded-xl overflow-hidden bg-secondary">
                  <img src={m} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPostMedia((arr) => arr.filter((x) => x !== m))}
                    aria-label="Прибрати"
                    className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-black/50 rounded-full"
                  >
                    <X className="w-3 h-3 text-white" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void tap("light");
                postMediaInput.current?.click();
              }}
            >
              <ImagePlus className="w-4 h-4 mr-1" strokeWidth={1.75} /> Фото
            </Button>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-white ml-auto"
              disabled={!postText.trim() || busy}
              onClick={submitPost}
            >
              <Send className="w-4 h-4 mr-1" strokeWidth={1.75} /> Опублікувати
            </Button>
          </div>
          <input
            ref={postMediaInput}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickPostMedia}
            className="hidden"
          />

          <div className="space-y-3 mt-4">
            {data?.posts.map((post) => (
              <div
                key={post.id}
                className="relative rounded-2xl border border-border p-3 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString("uk", { day: "numeric", month: "long" })}
                  </p>
                  <button
                    onClick={() => onDeletePost(post.id)}
                    aria-label="Видалити пост"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{post.text}</p>
                {post.media.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.media.map((m) => (
                      <img
                        key={m}
                        src={m}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover bg-secondary"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Wishlist */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Список бажань
            </label>
            <Button variant="outline" size="sm" onClick={openPicker}>
              <Plus className="w-4 h-4 mr-1" strokeWidth={1.75} /> З каталогу
            </Button>
          </div>

          {/* Custom wish */}
          <div className="rounded-2xl border border-border p-3 mb-3 space-y-2">
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Своє побажання (напр. Ліки для мами)"
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
            />
            <input
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Деталі (необов'язково)"
              className="w-full bg-secondary rounded-xl px-3 py-2 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={!customTitle.trim() || busy}
              onClick={onAddCustom}
            >
              Додати побажання
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data?.wishlist.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col rounded-2xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => onRemoveWish(item.id)}
                  aria-label="Прибрати"
                  className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center bg-black/50 rounded-full"
                >
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </button>
                <div className="aspect-square bg-secondary overflow-hidden">
                  {item.product?.images?.[0] ? (
                    <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
                      —
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground line-clamp-2">
                    {item.product?.title || item.title || "Побажання"}
                  </p>
                  {item.product && (
                    <p className="text-xs font-semibold text-accent mt-0.5">
                      {convert(item.product.price_cents).formatted}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Catalog picker modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col border border-border">
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Пошук у каталозі…"
                className="flex-1 bg-transparent text-sm outline-none text-foreground"
                autoFocus
              />
              <button
                onClick={() => setPickerOpen(false)}
                aria-label="Закрити"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
            <div className="overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.length === 0 ? (
                <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                  Нічого не знайдено
                </p>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onAddProduct(p.id)}
                    disabled={busy}
                    className="text-left rounded-2xl border border-border overflow-hidden hover:-translate-y-px transition-transform duration-150"
                  >
                    <div className="aspect-square bg-secondary overflow-hidden">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{p.title}</p>
                      <p className="text-xs font-semibold text-accent mt-0.5">
                        {convert(p.price_cents).formatted}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default RecipientPageEditor;
