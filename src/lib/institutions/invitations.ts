import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { sendInvitationEmail } from "@/lib/email/resend";
import { requestOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import type { InvitableRole } from "@/types/database";

export type IssuedInvitation =
  | { ok: true; url: string; emailed: boolean }
  | { ok: false; message: string };

function mapInvitationError(code: string | undefined, message: string) {
  switch (code) {
    case "23505":
      return "An invitation is already pending for that address, or the person is already a member.";
    case "42501":
      return "You do not have permission to invite that role to this institution.";
    case "22023":
      return "Enter a valid email address.";
    case "P0002":
      return "That institution no longer exists.";
    default:
      console.error("[invitations] create failed", code, message);
      return "The invitation could not be created. Try again.";
  }
}

/**
 * Creates a single-use invitation through the definer RPC and returns the
 * acceptance link. The raw token exists only in this response and in the link
 * that is emailed or copied by the inviter.
 */
export async function issueInvitation(input: {
  institutionId: string;
  institutionName: string;
  email: string;
  role: InvitableRole;
  expiresInDays: number;
  inviterName: string;
}): Promise<IssuedInvitation> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_invitation", {
    p_institution: input.institutionId,
    p_email: input.email,
    p_role: input.role,
    p_expires_in_days: input.expiresInDays,
  });

  if (error || !data) {
    return {
      ok: false,
      message: mapInvitationError(error?.code, error?.message ?? "no token returned"),
    };
  }

  const url = `${await requestOrigin()}/invite/${data}`;
  const email = await sendInvitationEmail({
    to: input.email,
    institutionName: input.institutionName,
    roleLabel: ROLE_LABELS[input.role],
    inviterName: input.inviterName,
    acceptUrl: url,
  });

  return { ok: true, url, emailed: email.sent };
}
