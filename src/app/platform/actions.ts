"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/require";
import type { FormState } from "@/lib/forms";
import { issueInvitation } from "@/lib/institutions/invitations";
import {
  parseInvitation,
  parseInstitutionProfile,
} from "@/lib/institutions/validation";
import { createClient } from "@/lib/supabase/server";
import type { InstitutionStatus } from "@/types/database";

const STATUSES: InstitutionStatus[] = [
  "pending",
  "active",
  "suspended",
  "archived",
];

export async function createInstitutionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePlatformAdmin();
  const parsed = parseInstitutionProfile(formData);

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutions")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      type: parsed.data.type,
      timezone: parsed.data.timezone,
      logo_url: parsed.data.logoUrl,
      brand_primary: parsed.data.brandPrimary,
      brand_accent: parsed.data.brandAccent,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        status: "error",
        message: "That slug is already in use.",
        fieldErrors: { slug: "Choose a different slug." },
      };
    }
    console.error("[platform] institution insert failed", context.user.id, error?.message);
    return {
      status: "error",
      message: "The institution could not be created. Try again.",
    };
  }

  revalidatePath("/platform");
  revalidatePath("/platform/institutions");
  redirect(`/platform/institutions/${data.id}?created=1`);
}

export async function changeInstitutionStatusAction(formData: FormData) {
  await requirePlatformAdmin();

  const institutionId = String(formData.get("institutionId") ?? "");
  const status = String(formData.get("status") ?? "") as InstitutionStatus;

  if (!institutionId || !STATUSES.includes(status)) {
    redirect("/platform/institutions?error=invalid-status");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("institutions")
    .update({ status })
    .eq("id", institutionId);

  revalidatePath("/platform");
  revalidatePath("/platform/institutions");
  revalidatePath(`/platform/institutions/${institutionId}`);

  if (error) {
    redirect(
      `/platform/institutions/${institutionId}?error=${encodeURIComponent("The status could not be changed.")}`,
    );
  }

  redirect(`/platform/institutions/${institutionId}?updated=status`);
}

export async function inviteInstitutionAdminAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requirePlatformAdmin();
  const institutionId = String(formData.get("institutionId") ?? "");
  const parsed = parseInvitation(formData);

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the invitation details.",
      fieldErrors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { data: institution } = await supabase
    .from("institutions")
    .select("name")
    .eq("id", institutionId)
    .maybeSingle();

  if (!institution) {
    return { status: "error", message: "That institution no longer exists." };
  }

  const result = await issueInvitation({
    institutionId,
    institutionName: institution.name,
    email: parsed.data.email,
    role: parsed.data.role,
    expiresInDays: parsed.data.expiresInDays,
    inviterName: context.user.name,
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath(`/platform/institutions/${institutionId}`);
  revalidatePath("/institution/members");

  return {
    status: "success",
    message: result.emailed
      ? "Invitation created and emailed."
      : "Invitation created. Email delivery is not configured, so share the link below.",
    inviteUrl: result.url,
    emailed: result.emailed,
  };
}
