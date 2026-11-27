import { redirect } from "next/navigation";
import type { MemberAuthContext } from "@/lib/auth/membership";
import { requireMember } from "@/lib/auth/require";

/**
 * Facilities are managed by institution and faculty administrators (the
 * `manage_facilities` capability). Department administrators may reach the
 * booking screens for their own department, which is what the RLS policies
 * allow. The database enforces the boundary; this guard only decides who sees
 * the screens.
 */
export async function requireFacilitiesAccess(): Promise<MemberAuthContext> {
  const context = await requireMember();
  const allowed =
    context.capabilities.includes("manage_facilities") || context.role === "department_admin";
  if (!allowed) redirect("/no-access?reason=forbidden");
  return context;
}
