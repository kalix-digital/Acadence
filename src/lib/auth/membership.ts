import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/config/env";
import { createClient } from "@/lib/supabase/server";
import {
  capabilitiesFor,
  type Capability,
} from "@/lib/auth/capabilities";
import type { MembershipRole } from "@/types/database";

/** Cookie that selects the active institution for a multi-membership user. */
export const ACTIVE_INSTITUTION_COOKIE = "acadence.active_institution";

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

  // Phase 3 decision OQ-004: path-based routing is deferred, so the active
  // tenant is resolved here from a cookie. A user who belongs to several
  // institutions picks one in the shell switcher; the choice is re-validated
  // against their active memberships on every request.
  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_INSTITUTION_COOKIE)?.value;
  const membership =
    memberships.find(
      (item) => item.institutionId && item.institutionId === preferred,
    ) ??
    memberships.find((item) => item.institutionId) ??
    memberships[0] ??
    null;

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
