"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ACADEMIC_ENTITIES,
  isAcademicEntity,
  type AcademicEntity,
} from "@/lib/academics/constants";
import {
  parseCampus,
  parseCourse,
  parseCurriculum,
  parseDepartment,
  parseFaculty,
  parseProgramme,
  parseSemester,
  parseSession,
} from "@/lib/academics/validation";
import { requireCapability } from "@/lib/auth/require";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

function entityFrom(formData: FormData): AcademicEntity | null {
  const value = String(formData.get("entity") ?? "");
  return isAcademicEntity(value) ? value : null;
}

function invalid(errors: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: errors,
  };
}

type DbError = { code?: string; message: string };

function dbError(scope: string, error: DbError, codeField = "code"): FormState {
  console.error(`[academics] ${scope}`, error.message);

  if (error.code === "23505") {
    return {
      status: "error",
      message: "A record with that code already exists in this institution.",
      fieldErrors: { [codeField]: "This code is already in use." },
    };
  }

  if (error.code === "42501") {
    return {
      status: "error",
      message:
        "Your role cannot change records at this level. Ask an administrator for the right scope.",
    };
  }

  if (error.code === "23503") {
    return {
      status: "error",
      message: "That reference belongs to a different part of the hierarchy.",
    };
  }

  if (error.code === "23514") {
    return {
      status: "error",
      message: "The dates or values break a rule for this record.",
    };
  }

  return { status: "error", message: "The record could not be saved. Try again." };
}

/**
 * Creates or updates one academic record. The database enforces the tenant
 * boundary and the role scope; this action only validates shape and reports
 * what the database refused.
 */
export async function saveAcademicRecordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireCapability("manage_academics");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return { status: "error", message: "No active institution selected." };
  }

  const entity = entityFrom(formData);
  if (!entity) {
    return { status: "error", message: "Unknown academic record type." };
  }

  const rawId = String(formData.get("id") ?? "");
  const id = rawId || null;
  const supabase = await createClient();
  const path = ACADEMIC_ENTITIES[entity].path;
  let error: DbError | null = null;

  switch (entity) {
    case "campus": {
      const parsed = parseCampus(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        name: parsed.data.name,
        code: parsed.data.code,
        address: parsed.data.address,
      };
      const result = id
        ? await supabase
            .from("campuses")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("campuses").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "faculty": {
      const parsed = parseFaculty(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        name: parsed.data.name,
        code: parsed.data.code,
        campus_id: parsed.data.campusId,
      };
      const result = id
        ? await supabase
            .from("faculties")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("faculties").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "department": {
      const parsed = parseDepartment(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        name: parsed.data.name,
        code: parsed.data.code,
        faculty_id: parsed.data.facultyId,
      };
      const result = id
        ? await supabase
            .from("departments")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("departments")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "session": {
      const parsed = parseSession(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        name: parsed.data.name,
        starts_on: parsed.data.startsOn,
        ends_on: parsed.data.endsOn,
        status: parsed.data.status,
      };
      const result = id
        ? await supabase
            .from("academic_sessions")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("academic_sessions")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "semester": {
      const parsed = parseSemester(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        session_id: parsed.data.sessionId,
        name: parsed.data.name,
        sequence: parsed.data.sequence,
        teaching_starts_on: parsed.data.teachingStartsOn,
        teaching_ends_on: parsed.data.teachingEndsOn,
        exam_starts_on: parsed.data.examStartsOn,
        exam_ends_on: parsed.data.examEndsOn,
        status: parsed.data.status,
      };
      const result = id
        ? await supabase
            .from("semesters")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("semesters").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "programme": {
      const parsed = parseProgramme(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        code: parsed.data.code,
        name: parsed.data.name,
        department_id: parsed.data.departmentId,
        level: parsed.data.level,
        duration_years: parsed.data.durationYears,
      };
      const result = id
        ? await supabase
            .from("programmes")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("programmes").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "course": {
      const parsed = parseCourse(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        code: parsed.data.code,
        title: parsed.data.title,
        department_id: parsed.data.departmentId,
        units: parsed.data.units,
        level: parsed.data.level,
        required_room_type: parsed.data.roomType,
        required_features: parsed.data.requiredFeatures,
      };
      const result = id
        ? await supabase
            .from("courses")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("courses").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "curriculum": {
      const parsed = parseCurriculum(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        programme_id: parsed.data.programmeId,
        course_id: parsed.data.courseId,
        level: parsed.data.level,
        requirement: parsed.data.requirement,
      };
      const result = id
        ? await supabase
            .from("programme_courses")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("programme_courses")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }
  }

  if (error) return dbError(entity, error);

  revalidatePath("/institution/academics");
  revalidatePath(path);
  redirect(`${path}?updated=${id ? "saved" : "created"}`);
}

/** Archives or restores a record. Deletion is not offered anywhere. */
export async function archiveAcademicRecordAction(formData: FormData) {
  const context = await requireCapability("manage_academics");
  const institutionId = context.membership.institutionId;
  const entity = entityFrom(formData);
  const id = String(formData.get("id") ?? "");
  const archived = String(formData.get("archived") ?? "1") !== "0";

  if (!institutionId || !entity || !id) {
    redirect("/institution/academics?error=invalid");
  }

  const supabase = await createClient();
  const table = ACADEMIC_ENTITIES[entity].table;
  const path = ACADEMIC_ENTITIES[entity].path;

  const { error } = await supabase
    .from(table)
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("institution_id", institutionId);

  if (error) {
    console.error("[academics] archive failed", error.message);
    redirect(`${path}?error=${encodeURIComponent("That record could not be updated.")}`);
  }

  revalidatePath("/institution/academics");
  revalidatePath(path);
  redirect(`${path}?updated=${archived ? "archived" : "restored"}`);
}
