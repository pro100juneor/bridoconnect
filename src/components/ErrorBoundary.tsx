import { Component, type ErrorInfo, type ReactNode } from "react";
import { useT } from "@/i18n/useT";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const CHUNK_RELOAD_FLAG = "chunk-reload-attempted";

/** Ошибка загрузки lazy-чанка (стейл-ассеты после деплоя). */
function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("dynamically imported module") || message.includes("Loading chunk");
}

/**
 * Экран ошибки вынесен в отдельный функциональный компонент: useT() — хук,
 * а из классового ErrorBoundary хуки вызывать нельзя.
 */
function ErrorFallback({ onReload }: { onReload: () => void }) {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl text-foreground">{t("common.error", "Щось пішло не так")}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t(
          "errorBoundary.desc",
          "Сталася помилка. Спробуйте перезавантажити сторінку — це зазвичай допомагає."
        )}
      </p>
      <button
        onClick={onReload}
        className="bg-accent text-white px-6 py-2.5 rounded-2xl text-sm font-medium min-h-[44px] transition-transform duration-150 hover:-translate-y-px"
      >
        {t("errorBoundary.reload", "Перезавантажити")}
      </button>
    </div>
  );
}

/**
 * Глобальный error boundary: без него любая ошибка рендера или упавший
 * lazy-чанк после деплоя = вечный белый экран.
 * При chunk-ошибке делает однократный авто-reload (флаг в sessionStorage,
 * чтобы не зациклиться), иначе показывает экран с кнопкой перезагрузки.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isChunkLoadError(error)) {
      let alreadyTried = false;
      try {
        alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1";
        if (!alreadyTried) sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
      } catch {
        // sessionStorage недоступен (приватный режим) — просто покажем экран ошибки
      }
      if (!alreadyTried) {
        window.location.reload();
        return;
      }
    }
    console.error("ErrorBoundary caught:", error, errorInfo.componentStack);
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
