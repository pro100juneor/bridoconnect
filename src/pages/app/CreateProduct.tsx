import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus, PackagePlus, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tap, notify } from "@/lib/native";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "@/hooks/use-toast";

const categories = ["Їжа", "Одяг", "Ліки", "Освіта", "Побут", "Зв'язок"];

const MAX_IMAGES = 20;
const MAX_VIDEOS = 5;
const MAX_VIDEO_SEC = 30;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

// Reads a video File's duration (seconds) via an off-DOM <video> element.
const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не вдалося прочитати відео"));
    };
    el.src = url;
  });

const CreateProduct = () => {
  const navigate = useNavigate();
  const { createProduct } = useProducts();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Keep latest object URLs in refs so the unmount cleanup can revoke them all.
  // Ref assignment happens in an effect (never during render).
  const previewsRef = useRef<string[]>([]);
  const videoPreviewsRef = useRef<string[]>([]);
  useEffect(() => {
    previewsRef.current = previews;
    videoPreviewsRef.current = videoPreviews;
  }, [previews, videoPreviews]);
  useEffect(
    () => () => {
      previewsRef.current.forEach((u) => URL.revokeObjectURL(u));
      videoPreviewsRef.current.forEach((u) => URL.revokeObjectURL(u));
    },
    []
  );

  const priceNum = parseFloat(price);
  const valid = title.trim().length > 0 && Number.isFinite(priceNum) && priceNum > 0;

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;
    if (files.length + picked.length > MAX_IMAGES) {
      void notify("error");
      toast({ title: `Максимум ${MAX_IMAGES} фото`, variant: "destructive" });
      return;
    }
    setFiles((f) => [...f, ...picked]);
    setPreviews((p) => [...p, ...picked.map((file) => URL.createObjectURL(file))]);
  };

  const onPickVideos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;
    if (videos.length + picked.length > MAX_VIDEOS) {
      void notify("error");
      toast({ title: `Максимум ${MAX_VIDEOS} відео`, variant: "destructive" });
      return;
    }
    const accepted: File[] = [];
    for (const file of picked) {
      if (file.size > MAX_VIDEO_BYTES) {
        void notify("error");
        toast({ title: "Відео завелике: максимум 50 МБ", variant: "destructive" });
        continue;
      }
      try {
        const duration = await readVideoDuration(file);
        if (duration > MAX_VIDEO_SEC + 0.5) {
          void notify("error");
          toast({ title: "Відео задовге: максимум 30 секунд", variant: "destructive" });
          continue;
        }
      } catch {
        void notify("error");
        toast({ title: "Не вдалося прочитати відео", variant: "destructive" });
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;
    setVideos((v) => [...v, ...accepted]);
    setVideoPreviews((p) => [...p, ...accepted.map((file) => URL.createObjectURL(file))]);
  };

  const removeFile = (idx: number) => {
    void tap("light");
    setPreviews((p) => {
      const url = p[idx];
      if (url) URL.revokeObjectURL(url);
      return p.filter((_, i) => i !== idx);
    });
    setFiles((f) => f.filter((_, i) => i !== idx));
  };

  const removeVideo = (idx: number) => {
    void tap("light");
    setVideoPreviews((p) => {
      const url = p[idx];
      if (url) URL.revokeObjectURL(url);
      return p.filter((_, i) => i !== idx);
    });
    setVideos((v) => v.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!valid || saving) return;
    void tap("medium");
    setSaving(true);
    const { id, error } = await createProduct({
      title: title.trim(),
      description: description.trim() || undefined,
      price_cents: Math.round(priceNum * 100),
      category: category || undefined,
      images: files,
      videos,
    });
    if (error || !id) {
      void notify("error");
      if (error && /capacity/i.test(error)) {
        toast({ title: "Досягнуто ліміту магазину (5000 позицій)", variant: "destructive" });
      } else {
        alert(error || "Не вдалося створити товар");
      }
      setSaving(false);
      return;
    }
    void notify("success");
    navigate(`/app/shop/${id}`);
  };

  return (
    <main className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">Новий товар</h2>
      </div>

      <div className="px-4 space-y-4 mt-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Фото (до 20) · {files.length}/{MAX_IMAGES}
          </label>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-secondary">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  aria-label="Видалити фото"
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/50 rounded-full"
                >
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </button>
              </div>
            ))}
            {files.length < MAX_IMAGES && (
              <button
                onClick={() => {
                  void tap("light");
                  fileInput.current?.click();
                }}
                aria-label="Додати фото"
                className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/50 transition-transform duration-150 hover:-translate-y-px"
              >
                <ImagePlus className="w-6 h-6" strokeWidth={1.75} />
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            className="hidden"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Відео (до 5, до 30с) · {videos.length}/{MAX_VIDEOS}
          </label>
          <div className="flex flex-wrap gap-2">
            {videoPreviews.map((src, i) => (
              <div key={src} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-secondary">
                <video
                  src={src}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeVideo(i)}
                  aria-label="Видалити відео"
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-black/50 rounded-full"
                >
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </button>
              </div>
            ))}
            {videos.length < MAX_VIDEOS && (
              <button
                onClick={() => {
                  void tap("light");
                  videoInput.current?.click();
                }}
                aria-label="Додати відео"
                className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/50 transition-transform duration-150 hover:-translate-y-px"
              >
                <Video className="w-6 h-6" strokeWidth={1.75} />
              </button>
            )}
          </div>
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            multiple
            onChange={onPickVideos}
            className="hidden"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Назва *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Наприклад: Продуктовий набір"
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Опис
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Що входить, стан, деталі…"
            rows={4}
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Ціна (€) *
          </label>
          <input
            type="number"
            min="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-xs text-muted-foreground mt-1">Одна позиція — одна одиниця товару</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Категорія
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  void tap("light");
                  setCategory(cat);
                }}
                className={`min-h-[44px] px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 hover:-translate-y-px ${
                  category === cat ? "bg-accent text-white border-accent" : "border-border text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full bg-accent hover:bg-accent/90 text-white gap-2 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
          disabled={!valid || saving}
          onClick={handleSubmit}
        >
          <PackagePlus className="w-4 h-4" strokeWidth={1.75} />{" "}
          {saving ? "Публікуємо…" : "Опублікувати товар"}
        </Button>
      </div>
    </main>
  );
};
export default CreateProduct;
