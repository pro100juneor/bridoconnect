import {
  Gift as GiftIcon,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { tap } from "@/lib/native";
import { useGifts, FulfillmentStatus } from "@/hooks/useGifts";
import { useCurrency } from "@/hooks/useCurrency";
import { useProfile } from "@/hooks/useProfile";
import { useT } from "@/i18n/useT";

const STATUS_META: Record<
  FulfillmentStatus,
  { icon: LucideIcon; cls: string; key: string; fallback: string }
> = {
  pending: {
    icon: Clock,
    cls: "text-muted-foreground bg-secondary",
    key: "gift.status.pending",
    fallback: "Очікує відправки",
  },
  accepted: {
    icon: Package,
    cls: "text-accent bg-accent/10",
    key: "gift.status.accepted",
    fallback: "Прийнято",
  },
  shipped: {
    icon: Truck,
    cls: "text-warning bg-warning/10",
    key: "gift.status.shipped",
    fallback: "Відправлено",
  },
  delivered: {
    icon: CheckCircle2,
    cls: "text-success bg-success/10",
    key: "gift.status.delivered",
    fallback: "Доставлено",
  },
  canceled: {
    icon: XCircle,
    cls: "text-destructive bg-destructive/10",
    key: "gift.status.canceled",
    fallback: "Скасовано",
  },
};

const Gifts = () => {
  const { profile } = useProfile();
  const { convert } = useCurrency();
  const { t } = useT();
  // Спонсор видит отправленные им подарки, остальные (получатель) — полученные.
  const mode = profile?.role === "sponsor" ? "sent" : "received";
  const { gifts, loading, error, reload } = useGifts(mode);

  const refetch = async () => {
    void tap("light");
    await reload();
  };

  return (
    <div className="pb-8">
      <h1 className="sr-only">{t("gift.screenTitle", "Подарунки")}</h1>
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3">
        <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">
          {t("gift.screenTitle", "Подарунки")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "sent"
            ? t("gift.sentSubtitle", "Подарунки, які ви надіслали отримувачам")
            : t("gift.receivedSubtitle", "Подарунки, які вам надіслали")}
        </p>
      </div>

      <PullToRefresh onRefresh={refetch}>
        {loading ? (
          <div className="px-4 mt-8 text-center text-sm text-muted-foreground">
            {t("shop.loading", "Завантаження…")}
          </div>
        ) : error ? (
          <div className="px-4 mt-8 text-center text-sm text-destructive">
            {t("common.retryLater", "Спробуйте пізніше")}
          </div>
        ) : gifts.length === 0 ? (
          <div className="px-4 mt-16 flex flex-col items-center text-center">
            <GiftIcon
              className="w-12 h-12 text-muted-foreground/30 mb-3"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground mb-1">
              {mode === "sent"
                ? t("gift.emptySent", "Ви ще не надсилали подарунків")
                : t("gift.emptyReceived", "Ще немає подарунків")}
            </p>
          </div>
        ) : (
          <div className="px-4 mt-3 space-y-3">
            {gifts.map((g) => {
              const meta = STATUS_META[g.fulfillment_status] ?? STATUS_META.pending;
              const StatusIcon = meta.icon;
              return (
                <article
                  key={g.id}
                  className="relative bg-card rounded-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
                >
                  <div className="flex items-start gap-3 p-3">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center shrink-0 overflow-hidden">
                      {g.product_image ? (
                        <img src={g.product_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package
                          className="w-7 h-7 text-muted-foreground/30"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground leading-tight line-clamp-2">
                        {g.product_title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {mode === "sent"
                          ? t("gift.toLine", "Отримувач: {name}", { name: g.beneficiary_name })
                          : t("gift.fromLine", "Продавець: {name}", { name: g.seller_name })}
                      </p>
                      <p className="text-sm font-bold text-foreground mt-1">
                        {convert(g.amount_cents).formatted}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.cls}`}
                        >
                          <StatusIcon className="w-3 h-3" strokeWidth={1.75} /> {t(meta.key, meta.fallback)}
                        </span>
                        {g.tracking && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {t("gift.tracking", "Трек: {n}", { n: g.tracking })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
};
export default Gifts;
