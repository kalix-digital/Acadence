"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth/require";
import type { FormState } from "@/lib/forms";
import {
  parseInstitutionProfile,
  parseInstitutionSettings,
} from "@/lib/institutions/validation";
import { createClient } from "@/lib/supabase/server";

export async function updateInstitutionProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireCapability("manage_institution");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return { status: "error", message: "No active institution selected." };
  }

  const parsed = parseInstitutionProfile(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.errors,
    };
  }

  // Status and slug are platform-level controls; the database trigger rejects
  // them for institution administrators, so they are not part of this update.
  const supabase = await createClient();
  const { error } = await supabase
    .from("institutions")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      timezone: parsed.data.timezone,
      logo_url: parsed.data.logoUrl,
      brand_primary: parsed.data.brandPrimary,
      brand_accent: parsed.data.brandAccent,
    })
    .eq("id", institutionId);

  if (error) {
    console.error("[settings] profile update failed", error.message);
    return { status: "error", message: "The institution profile could not be saved." };
  }

  revalidatePath("/institution");
  revalidatePath("/institution/settings");
  return { status: "success", message: "Institution profile saved." };
}

export async function updateInstitutionSettingsAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireCapability("manage_institution");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return { status: "error", message: "No active institution selected." };
  }

  const parsed = parseInstitutionSettings(formData);
  if (!parsed.ok) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("institution_settings")
    .update({
      working_days: parsed.data.workingDays,
      slot_minutes: parsed.data.slotMinutes,
      day_starts_at: parsed.data.dayStartsAt,
      day_ends_at: parsed.data.dayEndsAt,
      default_max_contact_hours: parsed.data.maxContactHours,
      allow_teaching_in_exams: parsed.data.allowTeachingInExams,
    })
    .eq("institution_id", institutionId);

  if (error) {
    console.error("[settings] academic defaults update failed", error.message);
    return { status: "error", message: "Academic defaults could not be saved." };
  }

  revalidatePath("/institution/settings");
  return { status: "success", message: "Academic defaults saved." };
}
