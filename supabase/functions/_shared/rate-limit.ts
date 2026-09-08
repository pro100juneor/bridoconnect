// Fixed-window rate limiter для Supabase Edge Functions.
// Использует Postgres таблицу edge_rate_limits (см. миграцию 017_rate_limits.sql).
// Fallback на in-memory Map если БД недоступна — предотвращает полный DoS через хвост.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

export interface RateLimitOptions {
  key: string; // например `stripe-webhook:${ip}` или `send-email:${userId}`
  limit: number; // сколько разрешено в окне
  windowSec: number; // размер окна в секундах
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number; // epoch ms
  retryAfter?: number; // seconds, если !ok
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const window = opts.windowSec * 1000;
  const windowStart = Math.floor(now / window) * window;
  const resetAt = windowStart + window;

  const url = opts.supabaseUrl ?? Deno.env.get("SUPABASE_URL") ?? "";
  const svc = opts.supabaseServiceKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (url && svc) {
    try {
      const supa = createClient(url, svc, { auth: { persistSession: false } });
      const { data, error } = await supa.rpc("edge_rate_limit_hit", {
        p_key: opts.key,
        p_window_start: new Date(windowStart).toISOString(),
        p_limit: opts.limit,
      });
      if (!error && data && typeof data.count === "number") {
        const remaining = Math.max(0, opts.limit - data.count);
        const ok = data.count <= opts.limit;
        return {
          ok,
          remaining,
          resetAt,
          retryAfter: ok ? undefined : Math.ceil((resetAt - now) / 1000),
        };
      }
    } catch {
      /* fallthrough to memory */
    }
  }

  // In-memory fallback (per-instance — при cold start счётчик сбрасывается)
  const bucket = memory.get(opts.key);
  if (!bucket || bucket.resetAt !== resetAt) {
    memory.set(opts.key, { count: 1, resetAt });
    return { ok: 1 <= opts.limit, remaining: opts.limit - 1, resetAt };
  }
  bucket.count += 1;
  const ok = bucket.count <= opts.limit;
  return {
    ok,
    remaining: Math.max(0, opts.limit - bucket.count),
    resetAt,
    retryAfter: ok ? undefined : Math.ceil((resetAt - now) / 1000),
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const h: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
  if (result.retryAfter) h["Retry-After"] = String(result.retryAfter);
  return h;
}

// Идентификатор клиента для rate-limit ключа
export function clientKey(req: Request, prefix: string): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}
