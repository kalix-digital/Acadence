"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTimetableAccess, requireTimetableReader } from "@/lib/timetables/access";
import {
  draftEntries,
  getDraft,
  liveVersion,
  offeringsForSemester,
  timetableLookups,
  versionEntries,
} from "@/lib/timetables/data";
import {
  buildTimetableImport,
  IDLE_TIMETABLE_IMPORT,
  type TimetableImportState,
} from "@/lib/timetables/import";
import { validateTimetable, type ConflictEntry } from "@/lib/timetables/conflicts";
import { weekdayLabel } from "@/lib/timetables/constants";
import {
  parseChangeRequest,
  parseTimetableDraft,
  parseTimetableEntry,
} from "@/lib/timetables/validation";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEventRow, RoomAvailabilityRow, SemesterRow } from "@/types/database";

type DbError = { code?: string; message: string };

function invalid(errors: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: errors,
  };
}

function dbError(scope: string, error: DbError): FormState {
  console.error(`[timetables] ${scope}`, error.message);

  if (error.code === "23P01") {
    return {
      status: "error",
      message:
        "That room, lecturer or student group is already booked at that time. Adjust the slot or the assignment.",
      fieldErrors: { startsAt: "This slot overlaps another entry." },
    };
  }

  if (error.code === "P0001") {
    return { status: "error", message: error.message };
  }

  if (error.code === "23505") {
    return {
      status: "error",
      message: "A draft with that title already exists for this semester.",
      fieldErrors: { title: "Choose a different title." },
    };
  }

  if (error.code === "42501") {
    return {
      status: "error",
      message: "Your role cannot change this timetable at that scope. Ask an administrator.",
    };
  }

  if (error.code === "23503") {
    return {
      status: "error",
      message: "One of those references belongs to a different part of the institution.",
    };
  }

  if (error.code === "23514") {
    return { status: "error", message: "One of those values breaks a timetable rule." };
  }

  return { status: "error", message: "The timetable could not be saved. Try again." };
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------
export async function saveTimetableDraftAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  if (!institutionId) return { status: "error", message: "No active institution selected." };

  const parsed = parseTimetableDraft(formData);
  if (!parsed.ok) return invalid(parsed.errors);

  const supabase = await createClient();
  const values = {
    semester_id: parsed.data.semesterId,
    department_id: parsed.data.departmentId,
    faculty_id: parsed.data.facultyId,
    title: parsed.data.title,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("timetable_drafts")
      .update(values)
      .eq("id", parsed.data.id)
      .eq("institution_id", institutionId);
    if (error) return dbError("draft update", error);

    revalidatePath("/institution/timetables");
    revalidatePath(`/institution/timetables/drafts/${parsed.data.id}`);
    return { status: "success", message: "Draft saved." };
  }

  const { data, error } = await supabase
    .from("timetable_drafts")
    .insert({ ...values, institution_id: institutionId, created_by: context.user.id })
    .select("id")
    .single();

  if (error) return dbError("draft create", error);

  revalidatePath("/institution/timetables");
  redirect(`/institution/timetables/drafts/${data.id}?updated=created`);
}

export async function archiveTimetableDraftAction(formData: FormData) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  const id = String(formData.get("id") ?? "");
  const archived = String(formData.get("archived") ?? "1") !== "0";

  if (!institutionId || !id) redirect("/institution/timetables?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("timetable_drafts")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("institution_id", institutionId);

  if (error) {
    redirect(
      `/institution/timetables?error=${encodeURIComponent(
        error.code === "42501" ? "Your role cannot archive that draft." : "That draft could not be updated.",
      )}`,
    );
  }

  revalidatePath("/institution/timetables");
  revalidatePath(`/institution/timetables/drafts/${id}`);
  redirect(`/institution/timetables?updated=${archived ? "archived" : "restored"}`);
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------
export async function saveTimetableEntryAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  if (!institutionId) return { status: "error", message: "No active institution selected." };

  const parsed = parseTimetableEntry(formData);
  if (!parsed.ok) return invalid(parsed.errors);

  const supabase = await createClient();
  const values = {
    draft_id: parsed.data.draftId,
    department_id: parsed.data.departmentId,
    offering_id: parsed.data.offeringId,
    lecturer_id: parsed.data.lecturerId,
    room_id: parsed.data.roomId,
    group_id: parsed.data.groupId,
    day_of_week: parsed.data.dayOfWeek,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    is_fixed: parsed.data.isFixed,
    notes: parsed.data.notes,
  };

  const { error } = parsed.data.id
    ? await supabase
        .from("timetable_entries")
        .update(values)
        .eq("id", parsed.data.id)
        .eq("institution_id", institutionId)
    : await supabase.from("timetable_entries").insert({
        ...values,
        institution_id: institutionId,
      });

  if (error) return dbError("entry save", error);

  revalidatePath(`/institution/timetables/drafts/${parsed.data.draftId}`);
  return {
    status: "success",
    message: parsed.data.id ? "Entry updated." : "Entry added to the draft.",
  };
}

export async function deleteTimetableEntryAction(formData: FormData) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  const id = String(formData.get("id") ?? "");
  const draftId = String(formData.get("draftId") ?? "");

  if (!institutionId || !id || !draftId) redirect("/institution/timetables?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("timetable_entries")
    .delete()
    .eq("id", id)
    .eq("institution_id", institutionId)
    .eq("draft_id", draftId);

  if (error) {
    redirect(
      `/institution/timetables/drafts/${draftId}?error=${encodeURIComponent(
        error.code === "P0001" ? error.message : "That entry could not be removed.",
      )}`,
    );
  }

  revalidatePath(`/institution/timetables/drafts/${draftId}`);
  redirect(`/institution/timetables/drafts/${draftId}?updated=removed`);
}

export type MoveEntryResult = { ok: boolean; message?: string };

/**
 * Drag-and-drop moves. The form-based editor is the accessible path to the
 * same change; this only skips the round trip through a full form.
 */
export async function moveTimetableEntryAction(input: {
  entryId: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
}): Promise<MoveEntryResult> {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  if (!institutionId) return { ok: false, message: "No active institution selected." };

  if (
    !/^[0-9a-f-]{36}$/i.test(input.entryId) ||
    !Number.isInteger(input.dayOfWeek) ||
    input.dayOfWeek < 1 ||
    input.dayOfWeek > 7 ||
    !/^\d{2}:\d{2}$/.test(input.startsAt) ||
    !/^\d{2}:\d{2}$/.test(input.endsAt) ||
    input.endsAt <= input.startsAt
  ) {
    return { ok: false, message: "That drop is not a valid slot." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("timetable_entries")
    .update({
      day_of_week: input.dayOfWeek,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
    })
    .eq("id", input.entryId)
    .eq("institution_id", institutionId)
    .not("draft_id", "is", null);

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23P01"
          ? "That slot overlaps another entry for the same room, lecturer or group."
          : error.code === "P0001"
            ? error.message
            : "The entry could not be moved.",
    };
  }

  revalidatePath("/institution/timetables");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------
async function conflictContext(institutionId: string, draftId: string) {
  const draft = await getDraft(institutionId, draftId);
  if (!draft) return null;

  const lookups = await timetableLookups(institutionId);
  const semester = lookups.semesters.find((row) => row.id === draft.semester_id);
  if (!semester) return null;

  const [offerings, draftRows, live, availability, events] = await Promise.all([
    offeringsForSemester(institutionId, draft.semester_id),
    draftEntries(institutionId, draft.id),
    liveVersion(institutionId, draft.semester_id),
    curateAvailability(institutionId, draft.semester_id),
    curateEvents(institutionId, semester.sessionId),
  ]);

  const liveRows = live ? await versionEntries(institutionId, live.id) : [];
  const facultyOf = new Map(lookups.departments.map((row) => [row.id, row.facultyId]));

  // The new version keeps the live version's rows outside this draft's scope.
  const carried = liveRows.filter((row) => {
    if (draft.department_id) return row.department_id !== draft.department_id;
    if (draft.faculty_id) {
      return !row.department_id || facultyOf.get(row.department_id) !== draft.faculty_id;
    }
    return false;
  });

  const toConflict = (row: (typeof draftRows)[number]): ConflictEntry => ({
    id: row.id,
    label: `${row.offeringLabel} ${weekdayLabel(row.day_of_week)} ${row.starts_at.slice(0, 5)}`,
    offering_id: row.offering_id,
    lecturer_id: row.lecturer_id,
    room_id: row.room_id,
    group_id: row.group_id,
    day_of_week: row.day_of_week,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
  });

  return {
    draft,
    semester,
    entries: [...carried, ...draftRows].map(toConflict),
    rooms: lookups.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      archived_at: room.archivedAt,
    })),
    offerings: offerings.map((offering) => ({
      id: offering.id,
      expected_size: offering.expectedSize,
      archived_at: offering.archivedAt,
    })),
    availability,
    settings: {
      working_days: lookups.settings?.working_days ?? [1, 2, 3, 4, 5],
      day_starts_at: lookups.settings?.day_starts_at ?? "08:00:00",
      day_ends_at: lookups.settings?.day_ends_at ?? "18:00:00",
      allow_teaching_in_exams: lookups.settings?.allow_teaching_in_exams ?? false,
    },
    events,
  };
}

async function curateAvailability(institutionId: string, semesterId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_availability")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("semester_id", semesterId)
    .is("archived_at", null);
  if (error) {
    console.error("[timetables] availability", error.message);
    return [] as RoomAvailabilityRow[];
  }
  return (data ?? []) as RoomAvailabilityRow[];
}

async function curateEvents(institutionId: string, sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("session_id", sessionId);
  if (error) {
    console.error("[timetables] calendar events", error.message);
    return [] as CalendarEventRow[];
  }
  return (data ?? []) as CalendarEventRow[];
}

function semesterFrom(
  semester: Awaited<ReturnType<typeof timetableLookups>>["semesters"][number],
): Pick<SemesterRow, "teaching_starts_on" | "teaching_ends_on" | "exam_starts_on" | "exam_ends_on"> {
  return {
    teaching_starts_on: semester.teachingStartsOn,
    teaching_ends_on: semester.teachingEndsOn,
    exam_starts_on: semester.examStartsOn,
    exam_ends_on: semester.examEndsOn,
  };
}

export async function publishTimetableAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  if (!institutionId) return { status: "error", message: "No active institution selected." };

  const draftId = String(formData.get("draftId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!draftId) return { status: "error", message: "Choose a draft to publish." };

  const candidate = await conflictContext(institutionId, draftId);
  if (!candidate) {
    return { status: "error", message: "That draft or its semester no longer exists." };
  }

  const issues = validateTimetable({
    entries: candidate.entries,
    rooms: candidate.rooms,
    offerings: candidate.offerings,
    availability: candidate.availability,
    settings: candidate.settings,
    semester: semesterFrom(candidate.semester),
    events: candidate.events,
  });

  if (issues.length > 0) {
    const shown = issues.slice(0, 5).map((issue) => `• ${issue.message}`);
    const extra = issues.length > 5 ? `\n…and ${issues.length - 5} more.` : "";
    return {
      status: "error",
      message: `Publishing is blocked by ${issues.length} hard ${
        issues.length === 1 ? "issue" : "issues"
      }:\n${shown.join("\n")}${extra}`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_timetable_draft", {
    p_draft_id: candidate.draft.id,
    p_change_summary: summary || `Published ${candidate.draft.title}`,
    p_report: { issues: 0, checkedAt: new Date().toISOString() },
  });

  if (error) return dbError("publish", error);

  revalidatePath("/institution/timetables");
  revalidatePath("/institution/timetables/versions");
  revalidatePath("/institution/timetables/views");
  revalidatePath(`/institution/timetables/drafts/${draftId}`);
  revalidatePath("/institution/facilities/utilisation");
  return {
    status: "success",
    message: "Published. The previous version is superseded and remains in history.",
  };
}

export async function duplicateTimetableDraftAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  if (!institutionId) return { status: "error", message: "No active institution selected." };

  const draftId = String(formData.get("draftId") ?? "");
  const semesterId = String(formData.get("semesterId") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!draftId || !semesterId) {
    return { status: "error", message: "Choose the target semester." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_timetable_draft", {
    p_draft_id: draftId,
    p_semester_id: semesterId,
    p_title: title,
  });

  if (error) return dbError("duplicate", error);

  const result = data as { draft_id: string; copied: number; skipped: unknown[] } | null;
  if (!result) return { status: "error", message: "The draft could not be copied." };

  revalidatePath("/institution/timetables");
  redirect(
    `/institution/timetables/drafts/${result.draft_id}?updated=copied&copied=${result.copied}&skipped=${
      result.skipped?.length ?? 0
    }`,
  );
}

export async function archiveTimetableVersionAction(formData: FormData) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  const id = String(formData.get("id") ?? "");

  if (!institutionId || !id) redirect("/institution/timetables/versions?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_timetable_version", { p_version_id: id });

  if (error) {
    redirect(
      `/institution/timetables/versions?error=${encodeURIComponent(
        error.code === "P0001" || error.code === "42501"
          ? error.message
          : "That version could not be archived.",
      )}`,
    );
  }

  revalidatePath("/institution/timetables/versions");
  redirect("/institution/timetables/versions?updated=archived");
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------
export async function importTimetableEntriesAction(
  previous: TimetableImportState,
  formData: FormData,
): Promise<TimetableImportState> {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  if (!institutionId) return { ...IDLE_TIMETABLE_IMPORT, status: "error", message: "No active institution." };

  const draftId = String(formData.get("draftId") ?? "");
  const mode = String(formData.get("mode") ?? "check");
  const csv = String(formData.get("csv") ?? previous.csv ?? "");

  if (!draftId) return { status: "error", message: "Open a draft before importing." };
  if (!csv.trim()) return { status: "error", message: "Paste or upload a CSV first.", draftId };

  const draft = await getDraft(institutionId, draftId);
  if (!draft) return { status: "error", message: "That draft no longer exists.", draftId };

  const [offerings, lookups] = await Promise.all([
    offeringsForSemester(institutionId, draft.semester_id),
    timetableLookups(institutionId),
  ]);

  const { preview, payloads } = buildTimetableImport({
    csv,
    semesterId: draft.semester_id,
    offerings,
    lookups,
  });

  if (mode === "check") {
    return {
      status: preview.fatal || preview.invalid > 0 ? "error" : "checked",
      message: preview.fatal
        ? preview.fatal
        : preview.invalid > 0
          ? `${preview.invalid} of ${preview.total} rows need attention. Nothing has been imported.`
          : `${preview.valid} rows validated. Import to write them to this draft.`,
      draftId,
      csv,
      preview,
    };
  }

  if (preview.fatal || preview.invalid > 0 || payloads.length === 0) {
    return {
      status: "error",
      message: "Fix every row before importing; nothing was written.",
      draftId,
      csv,
      preview,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("timetable_entries").insert(
    payloads.map((payload) => ({
      ...payload,
      institution_id: institutionId,
      draft_id: draftId,
    })),
  );

  if (error) {
    return {
      status: "error",
      message:
        error.code === "23P01"
          ? "The file clashes with itself or with the draft. Nothing was imported."
          : error.code === "P0001"
            ? error.message
            : "The import failed and nothing was written.",
      draftId,
      csv,
      preview,
    };
  }

  revalidatePath(`/institution/timetables/drafts/${draftId}`);
  return {
    status: "imported",
    message: `${payloads.length} entries imported into the draft.`,
    draftId,
    preview,
    imported: payloads.length,
  };
}

// ---------------------------------------------------------------------------
// Change requests
// ---------------------------------------------------------------------------
export async function submitChangeRequestAction(formData: FormData) {
  const context = await requireTimetableReader();
  const institutionId = context.membership.institutionId;
  const parsed = parseChangeRequest(formData);

  if (!institutionId) redirect("/lecturer/timetable?error=invalid");
  if (!parsed.ok) {
    redirect(`/lecturer/timetable?error=${encodeURIComponent(Object.values(parsed.errors)[0] ?? "Check the form.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_timetable_change_request", {
    p_entry_id: parsed.data.entryId,
    p_proposed: {
      day_of_week: parsed.data.dayOfWeek,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      ...(parsed.data.roomId ? { room_id: parsed.data.roomId } : {}),
    },
    p_reason: parsed.data.reason,
  });

  if (error) {
    redirect(
      `/lecturer/timetable?error=${encodeURIComponent(
        error.code === "P0001" || error.code === "42501"
          ? error.message
          : "The change request could not be submitted.",
      )}`,
    );
  }

  revalidatePath("/lecturer/timetable");
  revalidatePath("/institution/timetables/requests");
  redirect("/lecturer/timetable?updated=requested");
}

export async function reviewChangeRequestAction(formData: FormData) {
  const context = await requireTimetableAccess();
  if (!context.membership.institutionId) redirect("/institution/timetables/requests?error=invalid");

  const requestId = String(formData.get("id") ?? "");
  const approve = String(formData.get("approve") ?? "") === "1";
  const note = String(formData.get("note") ?? "").trim();

  if (!requestId) redirect("/institution/timetables/requests?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_timetable_change_request", {
    p_request_id: requestId,
    p_approve: approve,
    p_note: note || null,
  });

  if (error) {
    redirect(
      `/institution/timetables/requests?error=${encodeURIComponent(
        error.code === "P0001" || error.code === "42501"
          ? error.message
          : "That change request could not be reviewed.",
      )}`,
    );
  }

  revalidatePath("/institution/timetables/requests");
  revalidatePath("/institution/timetables/versions");
  revalidatePath("/institution/timetables/views");
  revalidatePath("/lecturer/timetable");
  redirect(`/institution/timetables/requests?updated=${approve ? "approved" : "rejected"}`);
}
