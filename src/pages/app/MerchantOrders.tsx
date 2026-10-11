import { useState } from "react";
import { Package, MapPin, Gift, Truck, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/components/PullToRefresh";
import { tap } from "@/lib/native";
import { toast } from "@/hooks/use-toast";
import { useMerchantOrders, MerchantOrder, OrderShipping } from "@/hooks/useMerchantOrders";
import type { FulfillmentStatus } from "@/hooks/useGifts";
import { useCurrency } from "@/hooks/useCurrency";
import { useT } from "@/i18n/useT";

const STATUS_LABEL: Record<FulfillmentStatus, { key: string; fallback: string; cls: string }> = {
  pending: {
    key: "gift.status.pending",
    fallback: "Очікує відправки",
    cls: "text-muted-foreground bg-secondary",
  },
  accepted: { key: "gift.status.accepted", fallback: "Прийнято", cls: "text-accent bg-accent/10" },
  shipped: { key: "gift.status.shipped", fallback: "Відправлено", cls: "text-warning bg-warning/10" },
  delivered: { key: "gift.status.delivered", fallback: "Доставлено", cls: "text-success bg-success/10" },
  canceled: { key: "gift.status.canceled", fallback: "Скасовано", cls: "text-destructive bg-destructive/10" },
};

function OrderCard({
  order,
  getShipping,
  updateFulfillment,
}: {
  order: MerchantOrder;
  getShipping: (id: string) => Promise<OrderShipping | null>;
  updateFulfillment: (
    id: string,
    status: FulfillmentStatus,
    tracking?: string
  ) => Promise<{ error?: string }>;
}) {
  const { convert } = useCurrency();
  const { t } = useT();
  const [address, setAddress] = useState<OrderShipping | null>(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrShown, setAddrShown] = useState(false);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);

  const meta = STATUS_LABEL[order.fulfillment_status] ?? STATUS_LABEL.pending;

  const revealAddress = async () => {
    void tap("light");
    setAddrShown(true);
    if (address) return;
    setAddrLoading(true);
    const a = await getShipping(order.id);
    setAddrLoading(false);
    if (!a) {
      toast({ title: t("orders.addrFailed", "Адресу недоступно"), variant: "destructive" });
      setAddrShown(false);
      return;
    }
    setAddress(a);
  };

  const act = async (status: FulfillmentStatus) => {
    if (busy) return;
    if (status === "shipped" && !tracking.trim()) {
      toast({ title: t("orders.trackingRequired", "Вкажіть трек-номер"), variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await updateFulfillment(
      order.id,
      status,
      status === "shipped" ? tracking.trim() : undefined
    );
    setBusy(false);
    if (error) {
      toast({
        title: t("orders.updateFailed", "Не вдалося оновити статус"),
        description: error,
        variant: "destructive",
      });
      return;
    }
    void tap("medium");
  };

  return (
    <article className="relative bg-card rounded-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8">
      <div className="flex items-start gap-3 p-3">
        <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center shrink-0 overflow-hidden">
          {order.product_image ? (
            <img src={order.product_image} alt="" className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6 text-muted-foreground/30" strokeWidth={1.75} aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-tight line-clamp-2">{order.product_title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("orders.buyerLine", "Покупець: {name}", { name: order.buyer_name })}
          </p>
          {order.is_gift && order.beneficiary_name && (
            <p className="text-xs text-accent inline-flex items-center gap-1 mt-0.5">
              <Gift className="w-3 h-3" strokeWidth={1.75} />{" "}
              {t("orders.giftTo", "Подарунок: {name}", { name: order.beneficiary_name })}
            </p>
          )}
          <p className="text-sm font-bold text-foreground mt-1">{convert(order.amount_cents).formatted}</p>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium mt-2 ${meta.cls}`}
          >
            {t(meta.key, meta.fallback)}
          </span>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {addrShown ? (
          addrLoading ? (
            <p className="text-xs text-muted-foreground">{t("shop.loading", "Завантаження…")}</p>
          ) : address ? (
            <div className="rounded-2xl bg-secondary p-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.75} />{" "}
                {address.full_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[address.street, address.city, address.postal_code, address.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {address.phone && <p className="text-xs text-muted-foreground">{address.phone}</p>}
              {address.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{address.notes}</p>}
            </div>
          ) : null
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 min-h-[44px]"
            onClick={() => void revealAddress()}
          >
            <MapPin className="w-4 h-4" strokeWidth={1.75} />{" "}
            {t("orders.showAddress", "Показати адресу доставки")}
          </Button>
        )}

        {order.fulfillment_status === "pending" && (
          <Button
            className="w-full gap-2 min-h-[44px] bg-accent hover:bg-accent/90 text-white"
            disabled={busy}
            onClick={() => void act("accepted")}
          >
            <Clock className="w-4 h-4" strokeWidth={1.75} /> {t("orders.accept", "Прийняти замовлення")}
          </Button>
        )}

        {(order.fulfillment_status === "pending" || order.fulfillment_status === "accepted") && (
          <div className="flex gap-2">
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder={t("orders.trackingPh", "Трек-номер")}
              aria-label={t("orders.trackingPh", "Трек-номер")}
              className="flex-1 bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30"
            />
            <Button
              className="gap-2 min-h-[44px] bg-accent hover:bg-accent/90 text-white"
              disabled={busy}
              onClick={() => void act("shipped")}
            >
              <Truck className="w-4 h-4" strokeWidth={1.75} /> {t("orders.ship", "Відправити")}
            </Button>
          </div>
        )}

        {order.fulfillment_status === "shipped" && (
          <Button
            className="w-full gap-2 min-h-[44px] bg-success hover:bg-success/90 text-white"
            disabled={busy}
            onClick={() => void act("delivered")}
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />{" "}
            {t("orders.markDelivered", "Позначити доставленим")}
          </Button>
        )}

        {order.tracking && (
          <p className="text-[11px] text-muted-foreground">
            {t("gift.tracking", "Трек: {n}", { n: order.tracking })}
          </p>
        )}
      </div>
    </article>
  );
}

const MerchantOrders = () => {
  const { t } = useT();
  const { orders, loading, error, reload, getShipping, updateFulfillment } = useMerchantOrders();

  const refetch = async () => {
    void tap("light");
    await reload();
  };

  return (
    <div className="pb-8">
      <h1 className="sr-only">{t("orders.title", "Замовлення")}</h1>
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-md px-4 pt-4 pb-3">
        <h2 className="font-serif text-4xl tracking-tight text-foreground animate-fade-in">
          {t("orders.title", "Замовлення")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("orders.subtitle", "Замовлення вашого магазину та їх відправка")}
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
        ) : orders.length === 0 ? (
          <div className="px-4 mt-16 flex flex-col items-center text-center">
            <Package
              className="w-12 h-12 text-muted-foreground/30 mb-3"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">{t("orders.empty", "Поки що немає замовлень")}</p>
          </div>
        ) : (
          <div className="px-4 mt-3 space-y-3">
            {orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                getShipping={getShipping}
                updateFulfillment={updateFulfillment}
              />
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
};
export default MerchantOrders;
