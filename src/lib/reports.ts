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

// Детектор попытки увести общение/оплату «мимо платформы» — топ-вектор скама во
// всех маркетплейсах (Fiverr/Upwork/Telegram). Консервативный: ловим только
// сильные сигналы (ссылки/имена внешних мессенджеров и длинные цепочки цифр —
// телефон/номер карты), чтобы не плодить ложные срабатывания в обычной переписке.
const OFF_PLATFORM_PATTERNS: RegExp[] = [
  /\b(telegram|telega|whats\s?app|viber|signal|wechat|skype)\b/i,
  /(?:t\.me|wa\.me|telegram\.me)\//i,
  // 10+ цифр с типичными разделителями — телефон или номер карты.
  /\d[\d\s().-]{8,}\d/,
];

export const detectOffPlatform = (text: string | null | undefined): boolean => {
  if (!text) return false;
  return OFF_PLATFORM_PATTERNS.some((re) => re.test(text));
};

export const unblockUser = async (blockerId: string, blockedId: string) => {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  return { error };
};
