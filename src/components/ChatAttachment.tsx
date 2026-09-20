import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { signChatAttachment, isImagePath } from "@/lib/chatAttachments";

// Renders a chat attachment from its private storage path by minting a
// short-lived signed URL (the bucket is not public).
export const ChatAttachment = ({ path, mine }: { path: string; mine: boolean }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void signChatAttachment(path).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [path]);

  if (!url) return <div className="w-40 h-32 rounded-lg bg-black/10 animate-pulse" />;

  if (isImagePath(path)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt="" className="max-w-[220px] max-h-[260px] rounded-lg object-cover" />
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
