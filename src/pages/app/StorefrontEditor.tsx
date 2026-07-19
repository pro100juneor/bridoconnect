import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ImagePlus,
  Search,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { tap, notify } from "@/lib/native";
import { toast } from "@/hooks/use-toast";
import { useShopProfile, type ShopProfilePatch } from "@/hooks/useShopProfile";
import { getTheme, THEME_COUNT } from "@/storefront/themes";
import Storefront from "@/storefront/Storefront";
import {
  ALL_BLOCKS,
  BLOCK_LABELS,
  DEFAULT_BLOCK_ORDER,
  type BlockKey,
  type ShopBrand,
  type ShopContacts,
  type ShopMessengers,
  type ShopProfile,
} from "@/storefront/types";

const PAGE_SIZE = 24;

const inputCls =
  "w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30";
const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1";

export default function StorefrontEditor() {
  const navigate = useNavigate();
  const { getMine, upsert, uploadLogo } = useShopProfile();
  const logoInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);

  // Editable draft state.
  const [themeId, setThemeId] = useState(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brand, setBrand] = useState<ShopBrand>({});
  const [contacts, setContacts] = useState<ShopContacts>({});
  const [messengers, setMessengers] = useState<ShopMessengers>({});
  const [order, setOrder] = useState<BlockKey[]>(DEFAULT_BLOCK_ORDER);
  const [hidden, setHidden] = useState<BlockKey[]>([]);
  const [published, setPublished] = useState(true);

  // Theme gallery UI.
  const [themePage, setThemePage] = useState(0);
  const [themeQuery, setThemeQuery] = useState("");

  useEffect(() => {
    // Build a full ordered list (all blocks) preserving any saved order first.
    const resolveWithHidden = (savedOrder?: BlockKey[]): BlockKey[] => {
      const seen = new Set<BlockKey>();
      const out: BlockKey[] = [];
      for (const k of savedOrder ?? DEFAULT_BLOCK_ORDER) {
        if (ALL_BLOCKS.includes(k) && !seen.has(k)) {
          seen.add(k);
          out.push(k);
        }
      }
      for (const k of DEFAULT_BLOCK_ORDER) if (!seen.has(k)) out.push(k);
      return out;
    };

    let alive = true;
    (async () => {
      const mine = await getMine();
      if (!alive) return;
      if (mine) {
        setSlug(mine.slug);
        setThemeId(mine.theme_id);
        setLogoUrl(mine.logo_url);
        setBrand(mine.brand ?? {});
        setContacts(mine.contacts ?? {});
        setMessengers(mine.messengers ?? {});
        setOrder(resolveWithHidden(mine.blocks?.order));
        setHidden(mine.blocks?.hidden ?? []);
        setPublished(mine.published);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draft: ShopProfile = useMemo(
    () => ({
      seller_id: "preview",
      slug: slug ?? "preview",
      theme_id: themeId,
      logo_url: logoUrl,
      brand,
      contacts,
      messengers,
      blocks: { order, hidden },
      published,
    }),
    [slug, themeId, logoUrl, brand, contacts, messengers, order, hidden, published]
  );

  const previewSeller = useMemo(
    () => ({ id: "preview", name: brand.name || "Ваш магазин", rating: 5, verified: true }),
    [brand.name]
  );

  const themeIds = useMemo(() => {
    const all = Array.from({ length: THEME_COUNT }, (_, i) => i + 1);
    const q = themeQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((id) => getTheme(id).name.toLowerCase().includes(q) || String(id) === q);
  }, [themeQuery]);

  const pageCount = Math.max(1, Math.ceil(themeIds.length / PAGE_SIZE));
  const pageThemes = themeIds.slice(themePage * PAGE_SIZE, themePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (themePage > pageCount - 1) setThemePage(0);
  }, [pageCount, themePage]);

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void tap("light");
    const { url, error } = await uploadLogo(file);
    if (error || !url) {
      void notify("error");
      toast({ title: error || "Не вдалося завантажити логотип", variant: "destructive" });
      return;
    }
    setLogoUrl(url);
  };

  const move = (idx: number, dir: -1 | 1) => {
    void tap("light");
    setOrder((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const toggleHidden = (key: BlockKey) => {
    void tap("light");
    setHidden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const save = async () => {
    if (saving) return;
    void tap("medium");
    setSaving(true);
    const patch: ShopProfilePatch = {
      theme_id: themeId,
      logo_url: logoUrl,
      brand,
      contacts,
      messengers,
      blocks: { order, hidden },
      published,
    };
    const { data, error } = await upsert(patch);
    setSaving(false);
    if (error || !data) {
      void notify("error");
      toast({ title: error || "Не вдалося зберегти", variant: "destructive" });
      return;
    }
    void notify("success");
    setSlug(data.slug);
    toast({ title: "Вітрину збережено" });
  };

  if (loading) {
    return <div className="px-4 mt-8 text-center text-sm text-muted-foreground">Завантаження…</div>;
  }

  const theme = getTheme(themeId);

  return (
    <main className="pb-32">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Оформлення вітрини</h2>
        {slug && (
          <button
            onClick={() => {
              void tap("light");
              navigate(`/store/${slug}`);
            }}
            className="text-xs font-medium text-accent flex items-center gap-1 min-h-[44px]"
          >
            <ExternalLink className="w-4 h-4" strokeWidth={1.75} /> Відкрити
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 px-4 mt-4">
        {/* -------- Form -------- */}
        <div className="space-y-6">
          {/* Theme gallery */}
          <section>
            <label className={labelCls}>
              Тема ({THEME_COUNT} стилів) · обрано #{themeId}
            </label>
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={themeQuery}
                onChange={(e) => {
                  setThemeQuery(e.target.value);
                  setThemePage(0);
                }}
                placeholder="Пошук за назвою або номером…"
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {pageThemes.map((id) => {
                const t = getTheme(id);
                const p = t.palette;
                const selected = id === themeId;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      void tap("light");
                      setThemeId(id);
                    }}
                    className={`relative rounded-xl overflow-hidden border text-left transition-transform duration-150 hover:-translate-y-px ${
                      selected ? "border-accent ring-2 ring-accent/40" : "border-border"
                    }`}
                    style={{ background: p.surface }}
                    title={t.name}
                  >
                    <div className="flex h-8">
                      <span className="flex-1" style={{ background: p.bg }} />
                      <span className="flex-1" style={{ background: p.primary }} />
                      <span className="flex-1" style={{ background: p.accent }} />
                      <span className="flex-1" style={{ background: p.fg }} />
                    </div>
                    <div className="px-1.5 py-1" style={{ background: p.surface }}>
                      <p className="text-[9px] leading-tight truncate" style={{ color: p.fg }}>
                        #{id} {p.name}
                      </p>
                      <p className="text-[8px] leading-tight truncate" style={{ color: p.muted }}>
                        {t.layout}
                      </p>
                    </div>
                    {selected && (
                      <span className="absolute top-1 right-1 bg-accent text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {pageCount > 1 && (
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setThemePage((p) => Math.max(0, p - 1))}
                  disabled={themePage === 0}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary disabled:opacity-40 min-h-[44px]"
                >
                  Назад
                </button>
                <span className="text-xs text-muted-foreground">
                  {themePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setThemePage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={themePage >= pageCount - 1}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary disabled:opacity-40 min-h-[44px]"
                >
                  Далі
                </button>
              </div>
            )}
          </section>

          {/* Logo */}
          <section>
            <label className={labelCls}>Логотип</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Логотип" className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-muted-foreground/50" strokeWidth={1.5} />
                )}
              </div>
              <button
                onClick={() => {
                  void tap("light");
                  logoInput.current?.click();
                }}
                className="flex items-center gap-2 text-sm bg-secondary rounded-2xl px-4 py-3 min-h-[44px]"
              >
                <ImagePlus className="w-4 h-4" strokeWidth={1.75} /> Завантажити
              </button>
              <input ref={logoInput} type="file" accept="image/*" onChange={onPickLogo} className="hidden" />
            </div>
          </section>

          {/* Brand text */}
          <section className="space-y-3">
            <div>
              <label className={labelCls}>Назва магазину</label>
              <input
                value={brand.name ?? ""}
                onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))}
                placeholder="Наприклад: Родинна пекарня"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Слоган</label>
              <input
                value={brand.tagline ?? ""}
                onChange={(e) => setBrand((b) => ({ ...b, tagline: e.target.value }))}
                placeholder="Короткий девіз бренду"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Опис</label>
              <textarea
                value={brand.about ?? ""}
                onChange={(e) => setBrand((b) => ({ ...b, about: e.target.value }))}
                placeholder="Розкажіть про ваш магазин…"
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className={labelCls}>Промо-заголовок</label>
              <input
                value={brand.promo_title ?? ""}
                onChange={(e) => setBrand((b) => ({ ...b, promo_title: e.target.value }))}
                placeholder="Напр.: Знижка -20% цього тижня"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Промо-текст</label>
              <input
                value={brand.promo_text ?? ""}
                onChange={(e) => setBrand((b) => ({ ...b, promo_text: e.target.value }))}
                placeholder="Деталі акції"
                className={inputCls}
              />
            </div>
          </section>

          {/* Contacts */}
          <section className="space-y-3">
            <p className="font-semibold text-sm text-foreground">Контакти</p>
            {(["phone", "email", "address", "site"] as (keyof ShopContacts)[]).map((k) => (
              <div key={k}>
                <label className={labelCls}>
                  {k === "phone" ? "Телефон" : k === "email" ? "Email" : k === "address" ? "Адреса" : "Сайт"}
                </label>
                <input
                  value={contacts[k] ?? ""}
                  onChange={(e) => setContacts((c) => ({ ...c, [k]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
          </section>

          {/* Messengers */}
          <section className="space-y-3">
            <p className="font-semibold text-sm text-foreground">Месенджери</p>
            {(
              [
                ["whatsapp", "WhatsApp (номер)"],
                ["telegram", "Telegram (@handle)"],
                ["viber", "Viber (номер)"],
                ["signal", "Signal (номер)"],
                ["messenger", "Messenger (handle)"],
              ] as [keyof ShopMessengers, string][]
            ).map(([k, label]) => (
              <div key={k}>
                <label className={labelCls}>{label}</label>
                <input
                  value={messengers[k] ?? ""}
                  onChange={(e) => setMessengers((m) => ({ ...m, [k]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
          </section>

          {/* Blocks order + visibility */}
          <section>
            <p className="font-semibold text-sm text-foreground mb-2">Блоки вітрини</p>
            <div className="space-y-2">
              {order.map((key, idx) => {
                const isHidden = hidden.includes(key);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-2xl border border-border bg-card"
                  >
                    <span
                      className={`flex-1 text-sm ${isHidden ? "text-muted-foreground line-through" : "text-foreground"}`}
                    >
                      {BLOCK_LABELS[key]}
                    </span>
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Вгору"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === order.length - 1}
                      aria-label="Вниз"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => toggleHidden(key)}
                      className={`text-xs px-3 h-9 rounded-xl font-medium ${
                        isHidden ? "bg-secondary text-muted-foreground" : "bg-accent text-white"
                      }`}
                    >
                      {isHidden ? "Сховано" : "Видно"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Published toggle */}
          <section className="flex items-center justify-between p-3 rounded-2xl border border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Опублікувати вітрину</p>
              <p className="text-xs text-muted-foreground">Вимкніть, щоб бачити лише вам (чернетка)</p>
            </div>
            <button
              onClick={() => {
                void tap("light");
                setPublished((v) => !v);
              }}
              role="switch"
              aria-checked={published}
              className={`w-12 h-7 rounded-full transition-colors relative ${published ? "bg-accent" : "bg-secondary"}`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  published ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </section>
        </div>

        {/* -------- Live preview -------- */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <label className={labelCls}>Попередній перегляд · {theme.name}</label>
          <div className="rounded-2xl overflow-hidden border border-border h-[70vh] overflow-y-auto">
            <Storefront profile={draft} theme={theme} products={[]} seller={previewSeller} preview />
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            className="flex-1 bg-accent hover:bg-accent/90 text-white gap-2 min-h-[48px] shadow-lg"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Збереження…" : "Зберегти"}
          </Button>
          {slug && (
            <Button
              variant="outline"
              className="min-h-[48px] gap-2 bg-background shadow-lg"
              onClick={() => {
                void tap("light");
                navigate(`/store/${slug}`);
              }}
            >
              <ExternalLink className="w-4 h-4" strokeWidth={1.75} /> Відкрити вітрину
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
