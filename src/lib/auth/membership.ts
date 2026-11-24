import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/config/env";
import { createClient } from "@/lib/supabase/server";
import {
  capabilitiesFor,
  type Capability,
} from "@/lib/auth/capabilities";
import type { MembershipRole } from "@/types/database";

export type MembershipSummary = {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  role: MembershipRole;
  status: "invited" | "active" | "suspended" | "revoked";
  facultyId: string | null;
  departmentId: string | null;
};

export type AuthContext = {
  user: {
    id: string;
    email: string | null;
    name: string;
  };
  memberships: MembershipSummary[];
  membership: MembershipSummary | null;
  role: MembershipRole | null;
  capabilities: Capability[];
  institution: { id: string; name: string } | null;
};

type MembershipQueryRow = {
  id: string;
  institution_id: string | null;
  role: MembershipRole;
  status: MembershipSummary["status"];
  faculty_id: string | null;
  department_id: string | null;
  institutions: { id: string; name: string } | null;
};

function displayName(user: User) {
  const metaName = user.user_metadata?.full_name;
  if (typeof metaName === "string" && metaName.trim()) return metaName.trim();
  return user.email?.split("@")[0] ?? "Acadence user";
}

/**
 * Resolves the signed-in user and their active memberships.
 * Returns null when Supabase is not configured or no user is signed in.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("institution_memberships")
    .select(
      "id, institution_id, role, status, faculty_id, department_id, institutions ( id, name )",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[auth] failed to load memberships", error.message);
  }

  const rows = (data ?? []) as unknown as MembershipQueryRow[];
  const memberships: MembershipSummary[] = rows.map((row) => ({
    id: row.id,
    institutionId: row.institution_id,
    institutionName: row.institutions?.name ?? null,
    role: row.role,
    status: row.status,
    facultyId: row.faculty_id,
    departmentId: row.department_id,
  }));

  const membership = memberships[0] ?? null;

  return {
    user: { id: user.id, email: user.email ?? null, name: displayName(user) },
    memberships,
    membership,
    role: membership?.role ?? null,
    capabilities: membership ? capabilitiesFor(membership.role) : [],
    institution: membership?.institutionId
      ? {
          id: membership.institutionId,
          name: membership.institutionName ?? "Institution",
        }
      : null,
  };
}

export type MemberAuthContext = AuthContext & {
  membership: MembershipSummary;
  role: MembershipRole;
  capabilities: Capability[];
};
