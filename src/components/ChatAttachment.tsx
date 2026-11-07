import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { signChatAttachment, isImagePath } from "@/lib/chatAttachments";
import { useT } from "@/i18n/useT";

// Renders a chat attachment from its private storage path by minting a
// short-lived signed URL (the bucket is not public).
export const ChatAttachment = ({ path, mine }: { path: string; mine: boolean }) => {
  const { t } = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    void signChatAttachment(path).then((u) => {
      if (!alive) return;
      setUrl(u);
      setStatus(u ? "ready" : "error");
    });
    return () => {
      alive = false;
    };
  }, [path]);

  if (status === "loading") return <div className="w-40 h-32 rounded-lg bg-black/10 animate-pulse" />;

  if (status === "error" || !url) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-sm ${mine ? "text-white/80" : "text-muted-foreground"}`}
      >
        <Paperclip className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
        {t("chat.attachmentUnavailable", "Вкладення недоступне")}
      </span>
    );
  }

  if (isImagePath(path)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={path.split("/").pop() || "Вкладення"}
      >
        <img
          src={url}
          alt={path.split("/").pop() || "Вкладення"}
          className="max-w-[220px] max-h-[260px] rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-sm underline ${mine ? "text-white" : "text-foreground"}`}
    >
      <Paperclip className="w-4 h-4" strokeWidth={1.75} />
      {path.split("/").pop()}
    </a>
  );
};
