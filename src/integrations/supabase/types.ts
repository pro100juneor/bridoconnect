export type UserRole = "sponsor" | "recipient" | "admin";
export type DealStatus = "pending" | "active" | "completed" | "cancelled" | "disputed";
export type TransactionType = "deposit" | "withdrawal" | "deal_payment" | "refund";
export type VerificationStatus = "pending" | "submitted" | "approved" | "rejected";
export type NotificationType = "deal_accepted" | "deal_completed" | "new_message" | "donation_received" | "review_received" | "system";

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

export interface VerificationRequest {
  id: string;
  user_id: string;
  document_type: "id_document" | "selfie" | "address_proof";
  document_path: string;
  status: VerificationStatus;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface Stream {
  id: string;
  host_id: string;
  title: string;
  category?: string;
  goal_amount?: number;
  raised: number;
  room_name: string;
  status: "live" | "ended";
  viewer_count: number;
  created_at: string;
  ended_at?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  target_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  deal_id?: string;
  read: boolean;
  created_at: string;
}
