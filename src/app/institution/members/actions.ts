"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth/require";
import type { FormState } from "@/lib/forms";
import { issueInvitation } from "@/lib/institutions/invitations";
import { parseInvitation, parseMemberRole } from "@/lib/institutions/validation";
import { createClient } from "@/lib/supabase/server";

const MEMBERS_PATH = "/institution/members";

function fail(message: string): never {
  redirect(`${MEMBERS_PATH}?error=${encodeURIComponent(message)}`);
}

export async function inviteMemberAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireCapability("manage_members");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return { status: "error", message: "No active institution selected." };
  }

  const parsed = parseInvitation(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the invitation details.",
      fieldErrors: parsed.errors,
    };
  }

  const result = await issueInvitation({
    institutionId,
    institutionName: context.institution?.name ?? "your institution",
    email: parsed.data.email,
    role: parsed.data.role,
    expiresInDays: parsed.data.expiresInDays,
    inviterName: context.user.name,
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath(MEMBERS_PATH);

  return {
    status: "success",
    message: result.emailed
      ? `Invitation sent to ${parsed.data.email}.`
      : "Invitation created. Email delivery is not configured, so share the link below.",
    inviteUrl: result.url,
    emailed: result.emailed,
  };
}

export async function revokeInvitationAction(formData: FormData) {
  const context = await requireCapability("manage_members");
  const invitationId = String(formData.get("invitationId") ?? "");

  if (!invitationId || !context.membership.institutionId) {
    fail("That invitation could not be identified.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("institution_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("institution_id", context.membership.institutionId)
    .is("accepted_at", null);

  if (error) {
    console.error("[members] revoke failed", error.message);
    fail("The invitation could not be revoked.");
  }

  revalidatePath(MEMBERS_PATH);
  redirect(`${MEMBERS_PATH}?updated=revoked`);
}

export async function changeMemberRoleAction(formData: FormData) {
  const context = await requireCapability("manage_members");
  const membershipId = String(formData.get("membershipId") ?? "");
  const parsed = parseMemberRole(String(formData.get("role") ?? ""));

  if (!membershipId || !parsed.ok || !context.membership.institutionId) {
    fail("That role change is not valid.");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("institution_memberships")
    .select("id, user_id, role")
    .eq("id", membershipId)
    .eq("institution_id", context.membership.institutionId)
    .maybeSingle();

  if (!target) fail("That member could not be found.");
  if (target.user_id === context.user.id) {
    fail("You cannot change your own role. Ask another administrator.");
  }

  const { error } = await supabase
    .from("institution_memberships")
    .update({ role: parsed.role })
    .eq("id", membershipId)
    .eq("institution_id", context.membership.institutionId);

  if (error) {
    console.error("[members] role change failed", error.message);
    fail("The role could not be changed.");
  }

  revalidatePath(MEMBERS_PATH);
  redirect(`${MEMBERS_PATH}?updated=role`);
}

export async function setMemberStatusAction(formData: FormData) {
  const context = await requireCapability("manage_members");
  const membershipId = String(formData.get("membershipId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!membershipId || !["active", "suspended"].includes(status)) {
    fail("That membership change is not valid.");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("institution_memberships")
    .select("id, user_id")
    .eq("id", membershipId)
    .maybeSingle();

  if (!target) fail("That member could not be found.");
  if (target.user_id === context.user.id) {
    fail("You cannot change your own membership status.");
  }

  const { error } = await supabase
    .from("institution_memberships")
    .update({ status })
    .eq("id", membershipId)
    .eq("institution_id", context.membership.institutionId);

  if (error) {
    console.error("[members] status change failed", error.message);
    fail("The membership status could not be changed.");
  }

  revalidatePath(MEMBERS_PATH);
  redirect(`${MEMBERS_PATH}?updated=status`);
}

export async function removeMemberAction(formData: FormData) {
  const context = await requireCapability("manage_members");
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!membershipId) fail("That member could not be identified.");

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("institution_memberships")
    .select("id, user_id")
    .eq("id", membershipId)
    .maybeSingle();

  if (!target) fail("That member could not be found.");
  if (target.user_id === context.user.id) {
    fail("You cannot remove your own membership.");
  }

  const { error } = await supabase
    .from("institution_memberships")
    .delete()
    .eq("id", membershipId)
    .eq("institution_id", context.membership.institutionId);

  if (error) {
    console.error("[members] removal failed", error.message);
    fail("The member could not be removed.");
  }

  revalidatePath(MEMBERS_PATH);
  redirect(`${MEMBERS_PATH}?updated=removed`);
}
