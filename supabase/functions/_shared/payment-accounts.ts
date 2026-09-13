// Доступ к profile_payment_accounts (миграция 035) — ID платёжных аккаунтов
// вынесены из profiles, чтобы не светились через публичный profiles_select.
// Все функции работают под service_role (RLS обходится).

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export interface PaymentAccounts {
  stripe_connect_account_id: string | null;
  paypal_merchant_id: string | null;
  adyen_account_holder_code: string | null;
  wise_recipient_id: string | null;
}

const EMPTY: PaymentAccounts = {
  stripe_connect_account_id: null,
  paypal_merchant_id: null,
  adyen_account_holder_code: null,
  wise_recipient_id: null,
};

export async function getPaymentAccounts(
  supabase: SupabaseClient,
  profileId: string
): Promise<PaymentAccounts> {
  const { data } = await supabase
    .from("profile_payment_accounts")
    .select("stripe_connect_account_id, paypal_merchant_id, adyen_account_holder_code, wise_recipient_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  return { ...EMPTY, ...(data ?? {}) };
}

export async function upsertPaymentAccounts(
  supabase: SupabaseClient,
  profileId: string,
  patch: Partial<PaymentAccounts>
): Promise<void> {
  const { error } = await supabase
    .from("profile_payment_accounts")
    .upsert({ profile_id: profileId, ...patch, updated_at: new Date().toISOString() });
  if (error) throw new Error(`payment_accounts upsert: ${error.message}`);
}

/** Обратный поиск для вебхуков: id аккаунта у процессора → profile_id. */
export async function findProfileByAccount(
  supabase: SupabaseClient,
  column: "stripe_connect_account_id" | "paypal_merchant_id",
  value: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profile_payment_accounts")
    .select("profile_id")
    .eq(column, value)
    .maybeSingle();
  return data?.profile_id ?? null;
}

/** Stripe Connect: account id (из ppa) + статус (из profiles) одним вызовом. */
export async function getStripeConnect(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ stripe_connect_account_id: string | null; stripe_connect_status: string | null }> {
  const [{ data: prof }, pay] = await Promise.all([
    supabase.from("profiles").select("stripe_connect_status").eq("id", profileId).maybeSingle(),
    getPaymentAccounts(supabase, profileId),
  ]);
  return {
    stripe_connect_account_id: pay.stripe_connect_account_id,
    stripe_connect_status: prof?.stripe_connect_status ?? null,
  };
}
