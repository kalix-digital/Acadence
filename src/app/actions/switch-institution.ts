"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_INSTITUTION_COOKIE,
  getAuthContext,
} from "@/lib/auth/membership";

/**
 * Sets the active tenant for a multi-institution user. The requested id is
 * checked against the caller's active memberships before the cookie is written,
 * so the cookie can never widen access — RLS still decides every row.
 */
export async function switchInstitutionAction(formData: FormData) {
  const institutionId = String(formData.get("institutionId") ?? "");
  const context = await getAuthContext();

  if (!context) redirect("/sign-in");

  const allowed = context.memberships.some(
    (membership) => membership.institutionId === institutionId,
  );
  if (!allowed) redirect("/no-access?reason=forbidden");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_INSTITUTION_COOKIE, institutionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/institution");
}
