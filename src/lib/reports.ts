import { supabase } from "@/integrations/supabase/client";

// Submit a user report (UGC moderation). `context` is a free tag such as
// 'chat:deal:<id>', 'chat:dm:<threadId>' or 'profile'.
export const submitReport = async (
  reporterId: string,
  reportedUserId: string,
  context: string,
  reason?: string
) => {
  if (!reporterId || !reportedUserId || reporterId === reportedUserId) {
    return { error: new Error("Invalid report") };
  }
  const { error } = await supabase
    .from("reports")
    .insert([{ reporter_id: reporterId, reported_user_id: reportedUserId, context, reason: reason ?? null }]);
  return { error };
};
