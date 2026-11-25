import { createClient } from "@/lib/supabase/server";
import type {
  InstitutionActivityRow,
  InstitutionInvitationRow,
  InstitutionRow,
  InstitutionSettingsRow,
  InstitutionStatus,
  MembershipRole,
  MembershipStatus,
} from "@/types/database";

export type MemberRecord = {
  id: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  fullName: string;
  email: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type InstitutionListItem = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: InstitutionStatus;
  timezone: string;
  createdAt: string;
  memberCount: number;
};

function fail(scope: string, message: string): never {
  console.error(`[institutions] ${scope}`, message);
  throw new Error(`Could not load ${scope}. ${message}`);
}

export async function listInstitutions(): Promise<InstitutionListItem[]> {
  const supabase = await createClient();

  const { data: institutions, error } = await supabase
    .from("institutions")
    .select("id, name, slug, type, status, timezone, created_at")
    .order("name");

  if (error) fail("institutions", error.message);

  const { data: memberships } = await supabase
    .from("institution_memberships")
    .select("institution_id, status");

  const counts = new Map<string, number>();
  for (const row of memberships ?? []) {
    if (!row.institution_id) continue;
    if (row.status === "active") {
      counts.set(row.institution_id, (counts.get(row.institution_id) ?? 0) + 1);
    }
  }

  return (institutions ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    status: row.status as InstitutionStatus,
    timezone: row.timezone,
    createdAt: row.created_at,
    memberCount: counts.get(row.id) ?? 0,
  }));
}

export async function getInstitution(
  institutionId: string,
): Promise<InstitutionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutions")
    .select("*")
    .eq("id", institutionId)
    .maybeSingle();

  if (error) fail("institution", error.message);
  return (data as InstitutionRow | null) ?? null;
}

export async function getInstitutionSettings(
  institutionId: string,
): Promise<InstitutionSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institution_settings")
    .select("*")
    .eq("institution_id", institutionId)
    .maybeSingle();

  if (error) fail("institution settings", error.message);
  return (data as InstitutionSettingsRow | null) ?? null;
}

export async function listMembers(
  institutionId: string,
): Promise<MemberRecord[]> {
  const supabase = await createClient();

  const { data: memberships, error } = await supabase
    .from("institution_memberships")
    .select(
      "id, user_id, role, status, invited_email, accepted_at, created_at",
    )
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: true });

  if (error) fail("members", error.message);

  const rows = memberships ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id))];

  const profiles = new Map<string, { full_name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const profile of profileRows ?? []) {
      profiles.set(profile.id, {
        full_name: profile.full_name,
        email: profile.email,
      });
    }
  }

  return rows.map((row) => {
    const profile = profiles.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      role: row.role as MembershipRole,
      status: row.status as MembershipStatus,
      fullName: profile?.full_name?.trim() || "Unnamed member",
      email: profile?.email ?? row.invited_email ?? "No email on record",
      acceptedAt: row.accepted_at,
      createdAt: row.created_at,
    };
  });
}

export async function listInvitations(
  institutionId: string,
): Promise<InstitutionInvitationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institution_invitations")
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false });

  if (error) fail("invitations", error.message);
  return (data ?? []) as InstitutionInvitationRow[];
}

export async function listActivity(
  institutionId: string | null,
  limit = 20,
): Promise<InstitutionActivityRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("institution_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (institutionId) query = query.eq("institution_id", institutionId);

  const { data, error } = await query;
  if (error) fail("activity", error.message);
  return (data ?? []) as InstitutionActivityRow[];
}

export function pendingInvitations(
  invitations: InstitutionInvitationRow[],
): InstitutionInvitationRow[] {
  const now = Date.now();
  return invitations.filter(
    (invitation) =>
      !invitation.accepted_at &&
      !invitation.revoked_at &&
      new Date(invitation.expires_at).getTime() > now,
  );
}

export async function getPlatformSummary() {
  const institutions = await listInstitutions();
  const supabase = await createClient();

  const { data: invitations } = await supabase
    .from("institution_invitations")
    .select("institution_id, accepted_at, revoked_at, expires_at");

  const now = Date.now();
  const pending = (invitations ?? []).filter(
    (row) =>
      !row.accepted_at &&
      !row.revoked_at &&
      new Date(row.expires_at).getTime() > now,
  ).length;

  return {
    institutions,
    total: institutions.length,
    active: institutions.filter((item) => item.status === "active").length,
    pending: institutions.filter((item) => item.status === "pending").length,
    suspended: institutions.filter((item) => item.status === "suspended").length,
    members: institutions.reduce((sum, item) => sum + item.memberCount, 0),
    pendingInvitations: pending,
  };
}
