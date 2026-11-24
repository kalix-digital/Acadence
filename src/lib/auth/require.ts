import { redirect } from "next/navigation";
import type { Capability } from "@/lib/auth/capabilities";
import {
  getAuthContext,
  type AuthContext,
  type MemberAuthContext,
} from "@/lib/auth/membership";

/** Any signed-in user, membership or not. */
export async function requireUser(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) redirect("/sign-in");
  return context;
}

/**
 * A signed-in user with an active institution membership. Unauthenticated
 * requests go to sign-in; authenticated users without a membership are sent to
 * the access page rather than seeing an empty tenant dashboard.
 */
export async function requireMember(): Promise<MemberAuthContext> {
  const context = await requireUser();
  if (!context.membership) redirect("/no-access");
  return context as MemberAuthContext;
}

export async function requireCapability(
  capability: Capability,
): Promise<MemberAuthContext> {
  const context = await requireMember();
  if (!context.capabilities.includes(capability)) {
    redirect("/no-access?reason=forbidden");
  }
  return context;
}
