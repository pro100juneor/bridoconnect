import type { Product } from "@/hooks/useProducts";
import type { StorefrontTheme } from "./themes";

export type BlockKey = "hero" | "about" | "catalog" | "contacts" | "messengers" | "promo";

export const ALL_BLOCKS: BlockKey[] = ["hero", "about", "contacts", "messengers", "catalog", "promo"];

// Sensible default block order (nothing hidden).
export const DEFAULT_BLOCK_ORDER: BlockKey[] = [
  "hero",
  "promo",
  "about",
  "catalog",
  "contacts",
  "messengers",
];

export const BLOCK_LABELS: Record<BlockKey, string> = {
  hero: "Шапка / логотип",
  about: "Опис магазину",
  catalog: "Каталог товарів",
  contacts: "Контакти",
  messengers: "Месенджери",
  promo: "Промо-банер",
};

export interface ShopBrand {
  name?: string;
  tagline?: string;
  about?: string;
  banner_url?: string;
  promo_title?: string;
  promo_text?: string;
}

export interface ShopContacts {
  phone?: string;
  email?: string;
  address?: string;
  site?: string;
}

export interface ShopMessengers {
  whatsapp?: string; // phone digits
  telegram?: string; // @handle or handle
  viber?: string; // phone
  signal?: string; // phone
  messenger?: string; // page handle
}

export interface ShopBlocksConfig {
  order?: BlockKey[];
  hidden?: BlockKey[];
}

export interface ShopProfile {
  seller_id: string;
  slug: string;
  theme_id: number;
  logo_url: string | null;
  brand: ShopBrand;
  contacts: ShopContacts;
  messengers: ShopMessengers;
  blocks: ShopBlocksConfig;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SellerSummary {
  id: string;
  name: string;
  country?: string | null;
  city?: string | null;
  rating?: number;
  verified?: boolean;
}

// Props every block receives.
export interface BlockProps {
  profile: ShopProfile;
  theme: StorefrontTheme;
  products: Product[];
  seller: SellerSummary | null;
}

// Resolve the effective, de-duplicated, visible block order for rendering.
export function resolveBlockOrder(cfg: ShopBlocksConfig | undefined): BlockKey[] {
  const hidden = new Set(cfg?.hidden ?? []);
  const seen = new Set<BlockKey>();
  const order: BlockKey[] = [];
  const source = cfg?.order && cfg.order.length > 0 ? cfg.order : DEFAULT_BLOCK_ORDER;
  for (const k of source) {
    if (!ALL_BLOCKS.includes(k) || seen.has(k)) continue;
    seen.add(k);
    if (!hidden.has(k)) order.push(k);
  }
  // Append any block missing from a partial saved order (unless hidden).
  for (const k of DEFAULT_BLOCK_ORDER) {
    if (!seen.has(k) && !hidden.has(k)) {
      seen.add(k);
      order.push(k);
    }
  }
  return order;
}

// Build deep-link URLs for messenger buttons (only for filled fields).
export interface MessengerLink {
  key: keyof ShopMessengers;
  label: string;
  href: string;
}

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");
const plusDigits = (s: string) => "+" + digitsOnly(s);
const handle = (s: string) => s.replace(/^@/, "").trim();

export function buildMessengerLinks(m: ShopMessengers | undefined): MessengerLink[] {
  if (!m) return [];
  const out: MessengerLink[] = [];
  if (m.whatsapp && digitsOnly(m.whatsapp)) {
    out.push({ key: "whatsapp", label: "WhatsApp", href: `https://wa.me/${digitsOnly(m.whatsapp)}` });
  }
  if (m.telegram && handle(m.telegram)) {
    out.push({ key: "telegram", label: "Telegram", href: `https://t.me/${handle(m.telegram)}` });
  }
  if (m.viber && digitsOnly(m.viber)) {
    out.push({ key: "viber", label: "Viber", href: `viber://chat?number=${plusDigits(m.viber)}` });
  }
  if (m.signal && digitsOnly(m.signal)) {
    out.push({ key: "signal", label: "Signal", href: `https://signal.me/#p/${plusDigits(m.signal)}` });
  }
  if (m.messenger && handle(m.messenger)) {
    out.push({ key: "messenger", label: "Messenger", href: `https://m.me/${handle(m.messenger)}` });
  }
  return out;
}
