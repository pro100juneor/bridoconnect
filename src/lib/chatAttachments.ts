import { supabase } from "@/integrations/supabase/client";

const BUCKET = "chat-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — keep in sync with the "до 10MB" UI hint.

// Upload a chat attachment into the participant-scoped path enforced by Storage
// RLS: `<scope>/<scopeId>/<uuid>.<ext>`. Returns the storage path (stored in
// messages.attachment_url), never a public URL — the bucket is private.
export const uploadChatAttachment = async (
  scope: "deal" | "dm",
  scopeId: string,
  file: File
): Promise<{ path?: string; error?: string }> => {
  if (file.size > MAX_BYTES) return { error: "too_large" };
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${scope}/${scopeId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) return { error: error.message };
  return { path };
};

export const signChatAttachment = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
};

export const isImagePath = (path: string) => /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(path);
