import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/native";
import { toast } from "@/hooks/use-toast";
import { useShippingAddresses, AddressInput } from "@/hooks/useShippingAddresses";
import { useT } from "@/i18n/useT";

const EMPTY: AddressInput = {
  full_name: "",
  phone: "",
  country: "",
  city: "",
  street: "",
  postal_code: "",
  notes: "",
};

const AddressBook = () => {
  const navigate = useNavigate();
  const { t } = useT();
  const { addresses, loading, error, addAddress, removeAddress } = useShippingAddresses();
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const field =
    "w-full bg-secondary rounded-2xl px-4 py-3 text-sm outline-none text-foreground focus:ring-2 focus:ring-accent/30";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1";

  const canSave = form.full_name.trim() && form.country.trim() && form.city.trim() && form.street.trim();

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const { error: err } = await addAddress({
      full_name: form.full_name.trim(),
      phone: form.phone?.trim() || undefined,
      country: form.country.trim(),
      city: form.city.trim(),
      street: form.street.trim(),
      postal_code: form.postal_code?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    });
    setSaving(false);
    if (err) {
      toast({
        title: t("address.saveFailed", "Не вдалося зберегти адресу"),
        description: err,
        variant: "destructive",
      });
      return;
    }
    void tap("medium");
    setForm(EMPTY);
    setAdding(false);
  };

  const remove = async (id: string) => {
    void tap("light");
    const { error: err } = await removeAddress(id);
    if (err) {
      toast({
        title: t("address.deleteFailed", "Не вдалося видалити"),
        description: err,
        variant: "destructive",
      });
    }
  };

  return (
    <main className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label={t("shop.back", "Назад")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={1.75} />
        </button>
        <h2 className="font-serif text-xl text-foreground flex-1 animate-fade-in">
          {t("address.title", "Адреси доставки")}
        </h2>
      </div>

      <div className="px-4">
        <p className="text-sm text-muted-foreground mb-4">
          {t(
            "address.intro",
            "Адреса потрібна, щоб отримувати подарунки. Її бачить лише продавець вашого замовлення."
          )}
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("shop.loading", "Завантаження…")}</p>
        ) : error ? (
          <p className="text-sm text-destructive">{t("common.retryLater", "Спробуйте пізніше")}</p>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8">
            <MapPin
              className="w-10 h-10 text-muted-foreground/30 mb-2"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">{t("address.empty", "Ще немає збережених адрес")}</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {addresses.map((a) => (
              <div
                key={a.id}
                className="relative flex items-start gap-3 p-4 rounded-2xl bg-card border border-border before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/8"
              >
                <MapPin
                  className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[a.street, a.city, a.postal_code, a.country].filter(Boolean).join(", ")}
                  </p>
                  {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
                  {a.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{a.notes}</p>}
                </div>
                <button
                  onClick={() => void remove(a.id)}
                  aria-label={t("address.delete", "Видалити адресу")}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}

        {adding ? (
          <div className="space-y-3 mt-2">
            <div>
              <label htmlFor="addr-name" className={labelCls}>
                {t("address.fullName", "Ім'я та прізвище")}
              </label>
              <input
                id="addr-name"
                className={field}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder={t("address.fullNamePh", "Напр.: Олена Коваль")}
              />
            </div>
            <div>
              <label htmlFor="addr-phone" className={labelCls}>
                {t("address.phone", "Телефон")}
              </label>
              <input
                id="addr-phone"
                className={field}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+380…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="addr-country" className={labelCls}>
                  {t("address.country", "Країна")}
                </label>
                <input
                  id="addr-country"
                  className={field}
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder={t("address.countryPh", "Україна")}
                />
              </div>
              <div>
                <label htmlFor="addr-city" className={labelCls}>
                  {t("address.city", "Місто")}
                </label>
                <input
                  id="addr-city"
                  className={field}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder={t("address.cityPh", "Київ")}
                />
              </div>
            </div>
            <div>
              <label htmlFor="addr-street" className={labelCls}>
                {t("address.street", "Вулиця, будинок, квартира")}
              </label>
              <input
                id="addr-street"
                className={field}
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                placeholder={t("address.streetPh", "вул. Хрещатик, 1, кв. 2")}
              />
            </div>
            <div>
              <label htmlFor="addr-zip" className={labelCls}>
                {t("address.postal", "Поштовий індекс")}
              </label>
              <input
                id="addr-zip"
                className={field}
                value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                placeholder="01001"
              />
            </div>
            <div>
              <label htmlFor="addr-notes" className={labelCls}>
                {t("address.notes", "Примітка для доставки")}
              </label>
              <textarea
                id="addr-notes"
                rows={2}
                className={`${field} resize-none`}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("address.notesPh", "Напр.: дзвонити за годину")}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => {
                  void tap("light");
                  setForm(EMPTY);
                  setAdding(false);
                }}
              >
                {t("common.cancel", "Скасувати")}
              </Button>
              <Button
                className="flex-1 min-h-[44px] bg-accent hover:bg-accent/90 text-white"
                disabled={!canSave || saving}
                onClick={() => void submit()}
              >
                {saving ? t("address.saving", "Зберігаємо…") : t("address.save", "Зберегти адресу")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
            onClick={() => {
              void tap("light");
              setAdding(true);
            }}
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} /> {t("address.add", "Додати адресу")}
          </Button>
        )}
      </div>
    </main>
  );
};

export default AddressBook;
