import { supabase } from "@/integrations/supabase/client";

const BUCKET = "chat-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — keep in sync with the "до 10MB" UI hint.

// Allowlist of accepted attachment types. The stored Content-Type is derived
// from this map by extension — never from the client-supplied file.type — so a
// user cannot upload e.g. an .html/.svg served as text/html (stored XSS). SVG is
// intentionally excluded because it can carry script.
const ALLOWED_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

// Upload a chat attachment into the participant-scoped path enforced by Storage
// RLS: `<scope>/<scopeId>/<uuid>.<ext>`. Returns the storage path (stored in
// messages.attachment_url), never a public URL — the bucket is private.
export const uploadChatAttachment = async (
  scope: "deal" | "dm",
  scopeId: string,
  file: File
): Promise<{ path?: string; error?: string }> => {
  if (file.size > MAX_BYTES) return { error: "too_large" };
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const contentType = ALLOWED_TYPES[ext];
  if (!contentType) return { error: "unsupported_type" };
  const path = `${scope}/${scopeId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    // contentType is derived from the allowlist, not from the untrusted file.type.
    .upload(path, file, { contentType, upsert: false });
  if (error) return { error: error.message };
  return { path };
};

export const signChatAttachment = async (path: string): Promise<string | null> => {
  // Non-images are served as downloads (never rendered inline) as defence in depth.
  const opts = isImagePath(path) ? undefined : { download: true };
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600, opts);
  if (error || !data) return null;
  return data.signedUrl;
};

export const isImagePath = (path: string) => /\.(png|jpe?g|gif|webp)$/i.test(path);
