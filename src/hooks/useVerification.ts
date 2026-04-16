import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useVerification = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async (file: File, type: "id_document" | "selfie" | "address_proof") => {
    if (!user) return { error: "Not authenticated" };
    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${type}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("verification_docs")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return { error: uploadError.message };
    }

    // Save verification request to DB
    await supabase.from("verification_requests").insert([{
      user_id: user.id,
      document_type: type,
      document_path: path,
      status: "pending",
    }] as any);

    setUploading(false);
    return { path };
  };

  const submitVerification = async () => {
    if (!user) return;
    // Mark all pending docs as submitted
    await supabase.from("verification_requests")
      .update({ status: "submitted" } as any)
      .eq("user_id", user.id)
      .eq("status", "pending");
  };

  return { uploadDocument, submitVerification, uploading, error };
};
