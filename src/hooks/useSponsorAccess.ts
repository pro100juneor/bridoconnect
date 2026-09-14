import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Per-request access to a sponsor's page. The gate is enforced in the DB
// (RLS on profile_access_grants + has_profile_access RPC). The revealed
// questionnaire itself lives in profile_sponsor_reveal (migration 038) whose
// SELECT policy calls the same gate, so a viewer without a grant cannot read it
// through PostgREST either. The Supabase client has no Database generic here,
// so `.from()` / `.rpc()` accept any name.

export type AccessStatus = "pending" | "granted" | "revoked" | "denied";

export interface AccessGrant {
  id: string;
  owner_id: string;
  requester_id: string;
  context: string;
  status: AccessStatus;
  message: string | null;
  created_at: string;
  decided_at: string | null;
  expires_at: string | null;
  // Joined profile of the counterparty (best-effort).
  requester?: { id: string; name: string | null; avatar_url: string | null } | null;
  owner?: { id: string; name: string | null; avatar_url: string | null } | null;
}

// Free-form, NON-sensitive questionnaire the sponsor chooses to reveal.
// No passport / bank fields here (Phase 5.3).
export interface SponsorReveal {
  about?: string;
  city?: string;
  occupation?: string;
  languages?: string;
  [key: string]: string | undefined;
}

export interface SponsorProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  reveal: SponsorReveal;
  canView: boolean;
  verification_status: "unverified" | "pending" | "verified";
}

export const useSponsorAccess = () => {
  const { user } = useAuth();

  // requester creates a pending request for a specific owner + context.
  const requestAccess = useCallback(
    async (ownerId: string, context = "general", message?: string) => {
      if (!user) return { error: "Not authenticated" as const };
      const { data, error } = await supabase
        .from("profile_access_grants")
        .insert({
          owner_id: ownerId,
          requester_id: user.id,
          context,
          status: "pending",
          message: message?.trim() || null,
        })
        .select()
        .single();
      return { data: data as unknown as AccessGrant | null, error };
    },
    [user]
  );

  // incoming requests — I am the owner (sponsor) reviewing who wants access.
  const incomingRequests = useCallback(async (): Promise<AccessGrant[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("profile_access_grants")
      .select("*, requester:profiles!requester_id(id, name, avatar_url)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as unknown as AccessGrant[];
  }, [user]);

  // outgoing requests — I am the requester tracking my own asks.
  const outgoingRequests = useCallback(async (): Promise<AccessGrant[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("profile_access_grants")
      .select("*, owner:profiles!owner_id(id, name, avatar_url)")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as unknown as AccessGrant[];
  }, [user]);

  // owner decides a single request. RLS blocks anyone but the owner.
  const decide = useCallback(
    async (grantId: string, status: "granted" | "denied" | "revoked", expiresAt?: string | null) => {
      if (!user) return { error: "Not authenticated" as const };
      const { data, error } = await supabase
        .from("profile_access_grants")
        .update({
          status,
          decided_at: new Date().toISOString(),
          expires_at: expiresAt ?? null,
        })
        .eq("id", grantId)
        .eq("owner_id", user.id)
        .select()
        .single();
      return { data: data as unknown as AccessGrant | null, error };
    },
    [user]
  );

  // per-request gate via the RPC. true iff viewer === owner OR an active grant exists.
  const canView = useCallback(
    async (ownerId: string): Promise<boolean> => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_profile_access", {
        p_owner: ownerId,
        p_viewer: user.id,
      });
      if (error) return false;
      return data === true;
    },
    [user]
  );

  // profile + revealed fields. The questionnaire lives in profile_sponsor_reveal
  // (migration 038) behind an RLS policy that calls the same has_profile_access
  // gate — a viewer without a grant gets an empty result from the DB itself, not
  // from this code. The canView call stays only to drive the UI copy.
  const getSponsorProfile = useCallback(
    async (ownerId: string): Promise<SponsorProfile | null> => {
      const [allowed, { data, error }, { data: revealRow }] = await Promise.all([
        canView(ownerId),
        supabase
          .from("profiles")
          .select("id, name, avatar_url, verification_status")
          .eq("id", ownerId)
          .maybeSingle(),
        supabase
          .from("profile_sponsor_reveal")
          .select("reveal")
          .eq("profile_id", ownerId)
          .maybeSingle(),
      ]);
      if (error || !data) return null;
      const row = data as unknown as {
        id: string;
        name: string | null;
        avatar_url: string | null;
        verification_status: SponsorProfile["verification_status"] | null;
      };
      const reveal = (revealRow as { reveal?: SponsorReveal | null } | null)?.reveal || {};
      return {
        id: row.id,
        name: row.name,
        avatar_url: row.avatar_url,
        // Nothing to show without a grant: RLS already returned no row.
        reveal: allowed ? reveal : {},
        canView: allowed,
        verification_status: row.verification_status ?? "unverified",
      };
    },
    [canView]
  );

  return {
    requestAccess,
    incomingRequests,
    outgoingRequests,
    decide,
    canView,
    getSponsorProfile,
  };
};

// Reads + saves the current user's own sponsor_reveal questionnaire.
export const useSponsorReveal = () => {
  const { user } = useAuth();
  const [reveal, setReveal] = useState<SponsorReveal>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("profile_sponsor_reveal")
      .select("reveal")
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setReveal((data as { reveal?: SponsorReveal | null }).reveal || {});
        setLoading(false);
      });
  }, [user]);

  const save = async (next: SponsorReveal) => {
    if (!user) return { error: "Not authenticated" as const };
    const { error } = await supabase
      .from("profile_sponsor_reveal")
      .upsert({ profile_id: user.id, reveal: next, updated_at: new Date().toISOString() });
    if (!error) setReveal(next);
    return { error };
  };

  return { reveal, loading, save };
};
