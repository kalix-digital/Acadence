"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { requestOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  "42501":
    "This invitation was issued to a different email address. Sign out and sign in with the invited address.",
  "23505": "This invitation has already been used, revoked or expired.",
  P0002: "This invitation link is not valid.",
  "28000": "Sign in to accept this invitation.",
};

export async function acceptInvitationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { status: "error", message: "The invitation link is incomplete." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Sign in to accept this invitation." };
  }

  const { error } = await supabase.rpc("accept_invitation_token", {
    p_token: token,
  });

  if (error) {
    console.error("[invite] acceptance failed", error.code, error.message);
    return {
      status: "error",
      message:
        ERROR_MESSAGES[error.code ?? ""] ??
        "The invitation could not be accepted. Ask your administrator for a new one.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/institution?joined=1");
}

export async function createAccountAndAcceptAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  if (!token) return { status: "error", message: "The invitation link is incomplete." };
  if (fullName.length < 2 || fullName.length > 120) {
    return {
      status: "error",
      message: "Enter your full name.",
      fieldErrors: { fullName: "Use between 2 and 120 characters." },
    };
  }
  if (password.length < 10) {
    return {
      status: "error",
      message: "Choose a stronger password.",
      fieldErrors: { password: "Use at least 10 characters." },
    };
  }
  if (password !== confirmation) {
    return {
      status: "error",
      message: "The passwords do not match.",
      fieldErrors: { confirmPassword: "Re-enter the same password." },
    };
  }

  const supabase = await createClient();

  const { data: previewRows } = await supabase.rpc("invitation_preview", {
    p_token: token,
  });
  const invitation = previewRows?.[0];

  if (!invitation || invitation.state !== "pending") {
    return {
      status: "error",
      message: "This invitation has already been used, revoked or expired.",
    };
  }

  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: invitation.email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/invite/${token}`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.user && data.user.identities?.length === 0) {
    return {
      status: "error",
      message:
        "An account already exists for this address. Sign in instead, then reopen the invitation link.",
    };
  }

  if (!data.session) {
    // Email confirmation is enabled on the Supabase project: the account exists
    // but cannot act until the address is confirmed.
    return {
      status: "success",
      message: `Check ${invitation.email} for a confirmation link. After confirming, reopen this invitation link to finish joining.`,
    };
  }

  const { error: acceptError } = await supabase.rpc("accept_invitation_token", {
    p_token: token,
  });

  if (acceptError) {
    console.error("[invite] acceptance after signup failed", acceptError.code);
    return {
      status: "error",
      message:
        ERROR_MESSAGES[acceptError.code ?? ""] ??
        "Your account was created but the invitation could not be accepted. Sign in and reopen the link.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/institution?joined=1");
}
