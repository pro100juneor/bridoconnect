import { ArrowUpRight, ArrowDownLeft, TrendingUp, RefreshCw, Wallet as WalletIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/native";
import { useTransactions } from "@/hooks/useTransactions";
import { useT, type TFunction } from "@/i18n/useT";

// Ключи здесь — значения type из БД, их не переводим; переводим только подписи.
// t приходит параметром: функция живёт вне компонента, хук тут вызвать нельзя.
const typeLabel = (type: string, t: TFunction): string => {
  switch (type) {
    case "deposit":
      return t("wallet.type.deposit", "Поповнення");
    case "withdrawal":
      return t("wallet.type.withdrawal", "Виведення");
    case "deal_payment":
      return t("wallet.type.dealPayment", "Платіж по угоді");
    case "refund":
      return t("wallet.type.refund", "Повернення");
    default:
      return type;
  }
};

const Wallet = () => {
  const navigate = useNavigate();
  const { t, localeTag } = useT();
  const { transactions, balance, loading, refetch } = useTransactions();

  const totalOut = transactions
    .filter((tx) => tx.type === "deal_payment" || tx.type === "withdrawal")
    .reduce((s, tx) => s + tx.amount, 0);
  const totalIn = transactions
    .filter((tx) => tx.type === "deposit" || tx.type === "refund")
    .reduce((s, tx) => s + tx.amount, 0);

  return (
    <div className="pb-8">
      <h1 className="sr-only">{t("wallet.title")}</h1>
      <div className="px-4 pt-4 pb-6 bg-primary text-white rounded-b-3xl mb-4">
        <h2 className="font-serif text-xl mb-6">{t("wallet.title")}</h2>
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm mb-1">{t("wallet.availableBalance", "Доступний баланс")}</p>
          <p className="text-4xl font-bold">€{balance.toFixed(2)}</p>
          <p className="text-white/40 text-xs mt-1">≈ ${(balance * 1.09).toFixed(0)} USD</p>
        </div>
        {/* Пополнение кошелька скрыто намеренно: вывод и расход баланса не
            реализованы, поэтому пополнение было бы дорогой в один конец.
            Возвращать кнопку — только вместе с выводом средств (см.
            KNOWN_ISSUES.md). Экран остаётся историей операций по сделкам. */}
        <div className="grid grid-cols-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/app/deals")}
            className="flex flex-col gap-1 h-14 bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span className="text-xs">{t("wallet.send", "Відправити")}</span>
          </Button>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">{t("wallet.sentTotal", "Відправлено")}</span>
            </div>
            <p className="text-lg font-bold text-foreground">€{totalOut.toFixed(0)}</p>
          </div>
          <div className="bg-secondary rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">{t("wallet.receivedTotal", "Поповнено")}</span>
            </div>
            <p className="text-lg font-bold text-foreground">€{totalIn.toFixed(0)}</p>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">{t("wallet.transactions", "Транзакції")}</h3>
          <button
            onClick={() => {
              void tap("light");
              void refetch();
            }}
            className="text-muted-foreground hover:text-foreground transition-transform duration-150 hover:-translate-y-px min-h-[44px] min-w-[44px] flex items-center justify-end"
            aria-label={t("wallet.refreshAria", "Оновити")}
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {!loading && transactions.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <WalletIcon className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed text-center max-w-[16rem]">
              {t("wallet.emptyTitle", "Транзакцій ще немає.")}
              <br />
              {t("wallet.emptyHint", "Поповніть гаманець, щоб почати.")}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {transactions.map((tx) => {
            const isOut = tx.type === "deal_payment" || tx.type === "withdrawal";
            return (
              <div
                key={tx.id}
                onClick={() => tx.deal_id && navigate(`/app/deal/${tx.deal_id}`)}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-shadow duration-200 ${
                  tx.deal_id
                    ? "cursor-pointer hover:shadow-[0_1px_2px_rgb(0_0_0/0.05),0_8px_24px_rgb(0_0_0/0.04)]"
                    : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isOut ? "bg-accent/10" : "bg-success/10"
                  }`}
                >
                  {isOut ? (
                    <ArrowUpRight className="w-5 h-5 text-accent" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-success" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{typeLabel(tx.type, t)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString(localeTag, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`font-semibold text-sm ${isOut ? "text-accent" : "text-success"}`}>
                  {isOut ? "-" : "+"}€{tx.amount.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
