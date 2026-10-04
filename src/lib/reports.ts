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

// Block a user (UGC safety, App Store Guideline 1.2). Once blocked, neither side
// can DM the other — enforced server-side by RLS on direct_messages (migration
// 054). Idempotent: a repeat block is a no-op, not an error.
export const blockUser = async (blockerId: string, blockedId: string) => {
  if (!blockerId || !blockedId || blockerId === blockedId) {
    return { error: new Error("Invalid block") };
  }
  const { error } = await supabase
    .from("user_blocks")
    .upsert([{ blocker_id: blockerId, blocked_id: blockedId }], { onConflict: "blocker_id,blocked_id" });
  return { error };
};

export const unblockUser = async (blockerId: string, blockedId: string) => {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  return { error };
};
