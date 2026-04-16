export type UserRole = "sponsor" | "recipient" | "admin";
export type DealStatus = "pending" | "active" | "completed" | "cancelled" | "disputed";
export type TransactionType = "deposit" | "withdrawal" | "deal_payment" | "refund";

export interface Profile {
  id: string;
  name: string;
  city?: string;
  country?: string;
  bio?: string;
  avatar_url?: string;
  role: UserRole;
  verified: boolean;
  rating: number;
  deals_count: number;
  total_helped: number;
  created_at: string;
}

export interface Deal {
  id: string;
  creator_id: string;
  sponsor_id?: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  raised: number;
  currency: string;
  status: DealStatus;
  urgent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  deal_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  deal_id?: string;
  amount: number;
  type: TransactionType;
  status: string;
  created_at: string;
}
