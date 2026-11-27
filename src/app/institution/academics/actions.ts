"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ACADEMIC_ENTITIES,
  isAcademicEntity,
  type AcademicEntity,
} from "@/lib/academics/constants";
import {
  academicLookups,
  existingIdentifiers,
} from "@/lib/academics/data";
import {
  buildImport,
  identifiersIn,
  type ImportState,
  type LecturerImportPayload,
  type StudentImportPayload,
} from "@/lib/academics/import";
import {
  parseCalendarEvent,
  parseCampus,
  parseCourse,
  parseCurriculum,
  parseDepartment,
  parseFaculty,
  parseGroupMember,
  parseLecturer,
  parseOffering,
  parseOfferingGroup,
  parseOfferingLecturer,
  parseProgramme,
  parseSemester,
  parseSession,
  parseStudent,
  parseStudentGroup,
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

function dbError(
  scope: string,
  error: DbError,
  codeField = "code",
  duplicate = {
    message: "A record with that code already exists in this institution.",
    field: "This code is already in use.",
  },
): FormState {
  console.error(`[academics] ${scope}`, error.message);

  if (error.code === "23505") {
    return {
      status: "error",
      message: duplicate.message,
      fieldErrors: { [codeField]: duplicate.field },
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

    case "student": {
      const parsed = parseStudent(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        matric_number: parsed.data.matricNumber,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        programme_id: parsed.data.programmeId,
        level: parsed.data.level,
        entry_session_id: parsed.data.entrySessionId,
        status: parsed.data.status,
      };
      const result = id
        ? await supabase
            .from("students")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("students").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "lecturer": {
      const parsed = parseLecturer(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        staff_number: parsed.data.staffNumber,
        title: parsed.data.title,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        department_id: parsed.data.departmentId,
        status: parsed.data.status,
      };
      const result = id
        ? await supabase
            .from("lecturers")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("lecturers").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "group": {
      const parsed = parseStudentGroup(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        programme_id: parsed.data.programmeId,
        session_id: parsed.data.sessionId,
        level: parsed.data.level,
        name: parsed.data.name,
        code: parsed.data.code,
        expected_size: parsed.data.expectedSize,
      };
      const result = id
        ? await supabase
            .from("student_groups")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("student_groups")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "groupMember": {
      const parsed = parseGroupMember(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        group_id: parsed.data.groupId,
        student_id: parsed.data.studentId,
      };
      const result = id
        ? await supabase
            .from("student_group_members")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("student_group_members")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "offering": {
      const parsed = parseOffering(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        course_id: parsed.data.courseId,
        session_id: parsed.data.sessionId,
        semester_id: parsed.data.semesterId,
        coordinator_lecturer_id: parsed.data.coordinatorLecturerId,
        expected_size: parsed.data.expectedSize,
        status: parsed.data.status,
        notes: parsed.data.notes,
      };
      const result = id
        ? await supabase
            .from("course_offerings")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("course_offerings")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "offeringLecturer": {
      const parsed = parseOfferingLecturer(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        offering_id: parsed.data.offeringId,
        lecturer_id: parsed.data.lecturerId,
        role: parsed.data.role,
        contact_hours: parsed.data.contactHours,
      };
      const result = id
        ? await supabase
            .from("course_offering_lecturers")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("course_offering_lecturers")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "offeringGroup": {
      const parsed = parseOfferingGroup(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        offering_id: parsed.data.offeringId,
        group_id: parsed.data.groupId,
      };
      const result = id
        ? await supabase
            .from("course_offering_groups")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("course_offering_groups")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "calendarEvent": {
      const parsed = parseCalendarEvent(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        session_id: parsed.data.sessionId,
        semester_id: parsed.data.semesterId,
        title: parsed.data.title,
        description: parsed.data.description,
        kind: parsed.data.kind,
        starts_on: parsed.data.startsOn,
        ends_on: parsed.data.endsOn,
      };
      const result = id
        ? await supabase
            .from("calendar_events")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("calendar_events")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }
  }

  if (error) {
    switch (entity) {
      case "student":
        return dbError("student", error, "matricNumber", {
          message: "That matriculation number or email is already in use.",
          field: "This identifier is already in use in the institution.",
        });
      case "lecturer":
        return dbError("lecturer", error, "staffNumber", {
          message: "That staff number or email is already in use.",
          field: "This identifier is already in use in the institution.",
        });
      case "groupMember":
        return dbError("group member", error, "studentId", {
          message: "That student is already a member of this group.",
          field: "This student is already in the group.",
        });
      case "offering":
        return dbError("offering", error, "courseId", {
          message: "That course is already offered in the chosen semester.",
          field: "This course already has an offering in that semester.",
        });
      case "offeringLecturer":
        return dbError("offering lecturer", error, "lecturerId", {
          message: "That lecturer is already assigned to this offering.",
          field: "This lecturer is already assigned.",
        });
      case "offeringGroup":
        return dbError("offering group", error, "groupId", {
          message: "That group is already linked to this offering.",
          field: "This group is already linked.",
        });
      default:
        return dbError(entity, error);
    }
  }

  revalidatePath("/institution/academics");
  revalidatePath(path);
  redirect(`${path}?updated=${id ? "saved" : "created"}`);
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;

/**
 * Two passes over the same file: `mode=dry` validates and reports every bad
 * row, `mode=commit` inserts the whole batch in one statement. A file with a
 * single invalid row imports nothing, so a failed import never leaves a
 * half-loaded roster behind.
 */
export async function importRecordsAction(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const context = await requireCapability("manage_academics");
  const institutionId = context.membership.institutionId;
  if (!institutionId) return { status: "error", message: "No active institution selected." };

  const entity = String(formData.get("entity") ?? "");
  if (entity !== "student" && entity !== "lecturer") {
    return { status: "error", message: "Choose whether to import students or lecturers." };
  }

  let csv = String(formData.get("csv") ?? "");
  const file = formData.get("file");
  if (file && typeof file === "object" && "text" in file && "size" in file) {
    const upload = file as File;
    if (upload.size > MAX_IMPORT_BYTES) {
      return { status: "error", message: "Keep the CSV under 2 MB." };
    }
    if (upload.size > 0) csv = await upload.text();
  }

  if (!csv.trim()) {
    return { status: "error", message: "Choose a CSV file or paste its contents." };
  }

  const mode = String(formData.get("mode") ?? "dry");
  const supabase = await createClient();
  const [lookups, existing] = await Promise.all([
    academicLookups(institutionId),
    existingIdentifiers(institutionId, entity, identifiersIn(csv, entity)),
  ]);

  const { preview, payloads } = buildImport({
    entity,
    csv,
    lookups: {
      programmes: lookups.programmes,
      sessions: lookups.sessions,
      departments: lookups.departments,
    },
    existing,
  });

  if (preview.fatal) {
    return { status: "error", message: preview.fatal, entity, csv };
  }

  if (preview.total > MAX_IMPORT_ROWS) {
    return {
      status: "error",
      message: `Split the file: one import takes at most ${MAX_IMPORT_ROWS} rows.`,
      entity,
      csv,
    };
  }

  if (mode !== "commit") {
    return { status: "checked", entity, csv, preview };
  }

  if (preview.invalid > 0) {
    return {
      status: "error",
      message: "Nothing was imported. Fix the rows listed below and check the file again.",
      entity,
      csv,
      preview,
    };
  }

  if (payloads.length === 0) {
    return { status: "error", message: "The file has no data rows to import.", entity, csv, preview };
  }

  const error =
    entity === "student"
      ? (
          await supabase.from("students").insert(
            (payloads as StudentImportPayload[]).map((row) => ({
              ...row,
              institution_id: institutionId,
            })),
          )
        ).error
      : (
          await supabase.from("lecturers").insert(
            (payloads as LecturerImportPayload[]).map((row) => ({
              ...row,
              institution_id: institutionId,
            })),
          )
        ).error;

  if (error) {
    console.error("[academics] import failed", error.message);
    return {
      status: "error",
      message:
        error.code === "42501"
          ? "Your role cannot import into this institution. Ask an administrator for the right scope."
          : "Nothing was imported: the database rejected the batch. Check the file and try again.",
      entity,
      csv,
      preview,
    };
  }

  revalidatePath("/institution/academics");
  revalidatePath(`/institution/academics/${entity === "student" ? "students" : "lecturers"}`);

  return {
    status: "imported",
    message: `Imported ${payloads.length} ${entity === "student" ? "students" : "lecturers"}.`,
    entity,
    preview,
    imported: payloads.length,
  };
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
