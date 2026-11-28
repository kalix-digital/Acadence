import { createClient } from "@/lib/supabase/server";
import type {
  InstitutionSettingsRow,
  TimetableChangeRequestRow,
  TimetableDraftRow,
  TimetableEntryRow,
  TimetableVersionRow,
} from "@/types/database";

export const TIMETABLE_PAGE_SIZE = 20;

type Supabase = Awaited<ReturnType<typeof createClient>>;

function fail(scope: string, message: string): never {
  console.error(`[timetables] ${scope}`, message);
  throw new Error(`Could not load ${scope}. ${message}`);
}

export type SemesterOption = {
  id: string;
  name: string;
  sessionId: string;
  sessionName: string;
  teachingStartsOn: string;
  teachingEndsOn: string;
  examStartsOn: string;
  examEndsOn: string;
};

export type OfferingOption = {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semesterId: string;
  departmentId: string;
  expectedSize: number | null;
  archivedAt: string | null;
};

export type TimetableLookups = {
  semesters: SemesterOption[];
  faculties: { id: string; name: string; code: string }[];
  departments: { id: string; name: string; code: string; facultyId: string }[];
  lecturers: { id: string; name: string; staffNumber: string; userId: string | null }[];
  rooms: { id: string; name: string; code: string; capacity: number; archivedAt: string | null }[];
  groups: { id: string; name: string; code: string; sessionId: string }[];
  offerings: OfferingOption[];
  settings: InstitutionSettingsRow | null;
};

export async function timetableLookups(institutionId: string): Promise<TimetableLookups> {
  const supabase = await createClient();

  const [semesters, sessions, faculties, departments, lecturers, rooms, groups, settings] =
    await Promise.all([
      supabase
        .from("semesters")
        .select("*")
        .eq("institution_id", institutionId)
        .is("archived_at", null)
        .order("teaching_starts_on", { ascending: false }),
      supabase.from("academic_sessions").select("id, name").eq("institution_id", institutionId),
      supabase
        .from("faculties")
        .select("id, name, code")
        .eq("institution_id", institutionId)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("departments")
        .select("id, name, code, faculty_id")
        .eq("institution_id", institutionId)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("lecturers")
        .select("id, title, first_name, last_name, staff_number, user_id")
        .eq("institution_id", institutionId)
        .is("archived_at", null)
        .order("last_name"),
      supabase
        .from("rooms")
        .select("id, name, code, capacity, archived_at")
        .eq("institution_id", institutionId)
        .order("name"),
      supabase
        .from("student_groups")
        .select("id, name, code, session_id")
        .eq("institution_id", institutionId)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("institution_settings")
        .select("*")
        .eq("institution_id", institutionId)
        .maybeSingle(),
    ]);

  for (const [scope, outcome] of [
    ["semesters", semesters],
    ["academic sessions", sessions],
    ["faculties", faculties],
    ["departments", departments],
    ["lecturers", lecturers],
    ["rooms", rooms],
    ["student groups", groups],
    ["institution settings", settings],
  ] as const) {
    if (outcome.error) fail(scope, outcome.error.message);
  }

  const sessionNames = new Map(
    ((sessions.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  const semesterRows = (semesters.data ?? []) as {
    id: string;
    name: string;
    session_id: string;
    teaching_starts_on: string;
    teaching_ends_on: string;
    exam_starts_on: string;
    exam_ends_on: string;
  }[];

  return {
    semesters: semesterRows.map((row) => ({
      id: row.id,
      name: row.name,
      sessionId: row.session_id,
      sessionName: sessionNames.get(row.session_id) ?? "Session",
      teachingStartsOn: row.teaching_starts_on,
      teachingEndsOn: row.teaching_ends_on,
      examStartsOn: row.exam_starts_on,
      examEndsOn: row.exam_ends_on,
    })),
    faculties: (faculties.data ?? []) as TimetableLookups["faculties"],
    departments: (
      (departments.data ?? []) as { id: string; name: string; code: string; faculty_id: string }[]
    ).map((row) => ({ id: row.id, name: row.name, code: row.code, facultyId: row.faculty_id })),
    lecturers: (
      (lecturers.data ?? []) as {
        id: string;
        title: string | null;
        first_name: string;
        last_name: string;
        staff_number: string;
        user_id: string | null;
      }[]
    ).map((row) => ({
      id: row.id,
      name: [row.title, `${row.first_name} ${row.last_name}`.trim()].filter(Boolean).join(" "),
      staffNumber: row.staff_number,
      userId: row.user_id,
    })),
    rooms: (
      (rooms.data ?? []) as {
        id: string;
        name: string;
        code: string;
        capacity: number;
        archived_at: string | null;
      }[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      capacity: row.capacity,
      archivedAt: row.archived_at,
    })),
    groups: (
      (groups.data ?? []) as { id: string; name: string; code: string; session_id: string }[]
    ).map((row) => ({ id: row.id, name: row.name, code: row.code, sessionId: row.session_id })),
    offerings: [],
    settings: (settings.data as InstitutionSettingsRow | null) ?? null,
  };
}

export async function offeringsForSemester(
  institutionId: string,
  semesterId: string | null,
): Promise<OfferingOption[]> {
  if (!semesterId) return [];
  const supabase = await createClient();

  const query = supabase
    .from("course_offerings")
    .select("id, course_id, semester_id, expected_size, archived_at")
    .eq("institution_id", institutionId)
    .eq("semester_id", semesterId);

  const [outcome, courses] = await Promise.all([
    query.order("created_at"),
    supabase.from("courses").select("id, code, title, department_id").eq("institution_id", institutionId),
  ]);

  if (outcome.error) fail("course offerings", outcome.error.message);
  if (courses.error) fail("courses", courses.error.message);

  const courseMap = new Map(
    ((courses.data ?? []) as { id: string; code: string; title: string; department_id: string }[]).map(
      (row) => [row.id, row],
    ),
  );

  return (
    (outcome.data ?? []) as {
      id: string;
      course_id: string;
      semester_id: string;
      expected_size: number | null;
      archived_at: string | null;
    }[]
  ).map((row) => {
    const course = courseMap.get(row.course_id);
    return {
      id: row.id,
      courseId: row.course_id,
      courseCode: course?.code ?? "—",
      courseTitle: course?.title ?? "Course",
      semesterId: row.semester_id,
      departmentId: course?.department_id ?? "",
      expectedSize: row.expected_size,
      archivedAt: row.archived_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Shared decoration
// ---------------------------------------------------------------------------
export type TimetableEntryDetail = TimetableEntryRow & {
  label: string;
  offeringLabel: string;
  lecturerName: string;
  roomName: string;
  groupName: string;
  departmentName: string;
};

type EntryMaps = Awaited<ReturnType<typeof entryMaps>>;

async function entryMaps(supabase: Supabase, institutionId: string) {
  const [offerings, courses, lecturers, rooms, groups, departments] = await Promise.all([
    supabase.from("course_offerings").select("id, course_id").eq("institution_id", institutionId),
    supabase.from("courses").select("id, code, title").eq("institution_id", institutionId),
    supabase
      .from("lecturers")
      .select("id, title, first_name, last_name")
      .eq("institution_id", institutionId),
    supabase.from("rooms").select("id, name").eq("institution_id", institutionId),
    supabase.from("student_groups").select("id, name, code").eq("institution_id", institutionId),
    supabase.from("departments").select("id, name").eq("institution_id", institutionId),
  ]);

  for (const [scope, outcome] of [
    ["offerings", offerings],
    ["courses", courses],
    ["lecturers", lecturers],
    ["rooms", rooms],
    ["student groups", groups],
    ["departments", departments],
  ] as const) {
    if (outcome.error) fail(scope, outcome.error.message);
  }

  const courseMap = new Map(
    ((courses.data ?? []) as { id: string; code: string; title: string }[]).map((row) => [row.id, row]),
  );

  return {
    courses: courseMap,
    offerings: new Map(
      ((offerings.data ?? []) as { id: string; course_id: string }[]).map((row) => [
        row.id,
        courseMap.get(row.course_id),
      ]),
    ),
    lecturers: new Map(
      (
        (lecturers.data ?? []) as {
          id: string;
          title: string | null;
          first_name: string;
          last_name: string;
        }[]
      ).map((row) => [
        row.id,
        [row.title, `${row.first_name} ${row.last_name}`.trim()].filter(Boolean).join(" "),
      ]),
    ),
    rooms: new Map(
      ((rooms.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
    ),
    groups: new Map(
      ((groups.data ?? []) as { id: string; name: string; code: string }[]).map((row) => [
        row.id,
        `${row.code} · ${row.name}`,
      ]),
    ),
    departments: new Map(
      ((departments.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
    ),
  };
}

function decorate(rows: TimetableEntryRow[], maps: EntryMaps): TimetableEntryDetail[] {
  return rows.map((row) => {
    const course = row.offering_id ? maps.offerings.get(row.offering_id) : undefined;
    const offeringLabel = course
      ? `${course.code} · ${course.title}`
      : row.is_fixed
        ? row.notes?.trim() || "Fixed entry"
        : "—";

    return {
      ...row,
      label: offeringLabel,
      offeringLabel,
      lecturerName: row.lecturer_id ? maps.lecturers.get(row.lecturer_id) ?? "—" : "—",
      roomName: row.room_id ? maps.rooms.get(row.room_id) ?? "—" : "—",
      groupName: row.group_id ? maps.groups.get(row.group_id) ?? "—" : "—",
      departmentName: row.department_id ? maps.departments.get(row.department_id) ?? "—" : "—",
    };
  });
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------
export type DraftListItem = TimetableDraftRow & {
  semesterName: string;
  sessionName: string;
  scopeName: string;
  entryCount: number;
};

export type Paged<T> = { rows: T[]; total: number; page: number; pageCount: number };

export async function listDrafts(
  institutionId: string,
  params: { semesterId?: string; archived?: boolean; page?: number } = {},
): Promise<Paged<DraftListItem>> {
  const supabase = await createClient();
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const from = (page - 1) * TIMETABLE_PAGE_SIZE;
  const to = from + TIMETABLE_PAGE_SIZE - 1;

  let query = supabase
    .from("timetable_drafts")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (params.semesterId) query = query.eq("semester_id", params.semesterId);

  const [outcome, semesters, sessions, faculties, departments] = await Promise.all([
    query.order("created_at", { ascending: false }).range(from, to),
    supabase.from("semesters").select("id, name, session_id").eq("institution_id", institutionId),
    supabase.from("academic_sessions").select("id, name").eq("institution_id", institutionId),
    supabase.from("faculties").select("id, name, code").eq("institution_id", institutionId),
    supabase.from("departments").select("id, name, code").eq("institution_id", institutionId),
  ]);

  if (outcome.error) fail("timetable drafts", outcome.error.message);
  for (const [scope, result] of [
    ["semesters", semesters],
    ["sessions", sessions],
    ["faculties", faculties],
    ["departments", departments],
  ] as const) {
    if (result.error) fail(scope, result.error.message);
  }

  const rows = (outcome.data ?? []) as TimetableDraftRow[];
  const ids = rows.map((row) => row.id);

  let counts = new Map<string, number>();
  if (ids.length > 0) {
    const entries = await supabase
      .from("timetable_entries")
      .select("draft_id")
      .eq("institution_id", institutionId)
      .in("draft_id", ids);
    if (entries.error) fail("draft entries", entries.error.message);
    counts = ((entries.data ?? []) as { draft_id: string }[]).reduce((map, row) => {
      map.set(row.draft_id, (map.get(row.draft_id) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }

  const sessionNames = new Map(
    ((sessions.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );
  const semesterRows = new Map(
    ((semesters.data ?? []) as { id: string; name: string; session_id: string }[]).map((row) => [
      row.id,
      row,
    ]),
  );
  const facultyNames = new Map(
    ((faculties.data ?? []) as { id: string; name: string; code: string }[]).map((row) => [
      row.id,
      `${row.code} · ${row.name}`,
    ]),
  );
  const departmentNames = new Map(
    ((departments.data ?? []) as { id: string; name: string; code: string }[]).map((row) => [
      row.id,
      `${row.code} · ${row.name}`,
    ]),
  );

  const total = outcome.count ?? rows.length;

  return {
    rows: rows.map((row) => {
      const semester = semesterRows.get(row.semester_id);
      return {
        ...row,
        semesterName: semester?.name ?? "—",
        sessionName: semester ? sessionNames.get(semester.session_id) ?? "—" : "—",
        scopeName: row.department_id
          ? departmentNames.get(row.department_id) ?? "Department"
          : row.faculty_id
            ? facultyNames.get(row.faculty_id) ?? "Faculty"
            : "Whole institution",
        entryCount: counts.get(row.id) ?? 0,
      };
    }),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TIMETABLE_PAGE_SIZE)),
  };
}

export async function getDraft(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timetable_drafts")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("timetable draft", error.message);
  return (data as TimetableDraftRow | null) ?? null;
}

export async function draftEntries(institutionId: string, draftId: string) {
  const supabase = await createClient();
  const outcome = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("draft_id", draftId)
    .order("day_of_week")
    .order("starts_at");

  if (outcome.error) fail("draft entries", outcome.error.message);
  const maps = await entryMaps(supabase, institutionId);
  return decorate((outcome.data ?? []) as TimetableEntryRow[], maps);
}

export async function getDraftEntry(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("draft entry", error.message);
  return (data as TimetableEntryRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------
export type VersionListItem = TimetableVersionRow & {
  semesterName: string;
  sessionName: string;
  entryCount: number;
  publisherName: string;
};

export async function listVersions(
  institutionId: string,
  params: { semesterId?: string; includeArchived?: boolean } = {},
): Promise<VersionListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("timetable_versions")
    .select("*")
    .eq("institution_id", institutionId);
  if (params.semesterId) query = query.eq("semester_id", params.semesterId);
  if (!params.includeArchived) query = query.neq("status", "archived");

  const outcome = await query.order("published_at", { ascending: false }).limit(100);
  if (outcome.error) fail("timetable versions", outcome.error.message);

  const rows = (outcome.data ?? []) as TimetableVersionRow[];
  const ids = rows.map((row) => row.id);

  const [entries, semesters, sessions, profiles] = await Promise.all([
    ids.length > 0
      ? supabase
          .from("timetable_entries")
          .select("version_id")
          .eq("institution_id", institutionId)
          .in("version_id", ids)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("semesters").select("id, name, session_id").eq("institution_id", institutionId),
    supabase.from("academic_sessions").select("id, name").eq("institution_id", institutionId),
    supabase.from("profiles").select("id, full_name").in("id", rows.map((row) => row.published_by).filter(Boolean) as string[]),
  ]);

  if (entries.error) fail("version entries", entries.error.message);
  if (semesters.error) fail("semesters", semesters.error.message);
  if (sessions.error) fail("sessions", sessions.error.message);
  if (profiles.error) fail("profiles", profiles.error.message);

  const counts = new Map<string, number>();
  for (const row of (entries.data ?? []) as { version_id: string }[]) {
    counts.set(row.version_id, (counts.get(row.version_id) ?? 0) + 1);
  }

  const sessionNames = new Map(
    ((sessions.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );
  const semesterRows = new Map(
    ((semesters.data ?? []) as { id: string; name: string; session_id: string }[]).map((row) => [
      row.id,
      row,
    ]),
  );
  const publisherNames = new Map(
    ((profiles.data ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? "Administrator",
    ]),
  );

  return rows.map((row) => {
    const semester = semesterRows.get(row.semester_id);
    return {
      ...row,
      semesterName: semester?.name ?? "—",
      sessionName: semester ? sessionNames.get(semester.session_id) ?? "—" : "—",
      entryCount: counts.get(row.id) ?? 0,
      publisherName: row.published_by ? publisherNames.get(row.published_by) ?? "Administrator" : "System",
    };
  });
}

export async function getVersion(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timetable_versions")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("timetable version", error.message);
  return (data as TimetableVersionRow | null) ?? null;
}

export async function versionEntries(institutionId: string, versionId: string) {
  const supabase = await createClient();
  const outcome = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("version_id", versionId)
    .order("day_of_week")
    .order("starts_at");

  if (outcome.error) fail("version entries", outcome.error.message);
  const maps = await entryMaps(supabase, institutionId);
  return decorate((outcome.data ?? []) as TimetableEntryRow[], maps);
}

export async function liveVersion(institutionId: string, semesterId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timetable_versions")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("semester_id", semesterId)
    .eq("status", "published")
    .maybeSingle();
  if (error) fail("live timetable", error.message);
  return (data as TimetableVersionRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Change requests
// ---------------------------------------------------------------------------
export type ChangeRequestListItem = TimetableChangeRequestRow & {
  entryLabel: string;
  entryDay: number;
  entryStartsAt: string;
  entryEndsAt: string;
  roomName: string;
  requesterName: string;
  reviewerName: string | null;
};

export async function listChangeRequests(
  institutionId: string,
  params: { status?: string } = {},
): Promise<ChangeRequestListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("timetable_change_requests")
    .select("*")
    .eq("institution_id", institutionId);
  if (params.status === "pending" || params.status === "approved" || params.status === "rejected") {
    query = query.eq("status", params.status);
  }

  const [outcome, entries] = await Promise.all([
    query.order("created_at", { ascending: false }).limit(100),
    supabase.from("timetable_entries").select("*").eq("institution_id", institutionId),
  ]);

  if (outcome.error) fail("change requests", outcome.error.message);
  if (entries.error) fail("change request entries", entries.error.message);

  const maps = await entryMaps(supabase, institutionId);
  const entryRows = new Map(
    decorate((entries.data ?? []) as TimetableEntryRow[], maps).map((row) => [row.id, row]),
  );

  const rows = (outcome.data ?? []) as TimetableChangeRequestRow[];
  const userIds = [
    ...new Set(
      rows.flatMap((row) => [row.requested_by, row.reviewed_by]).filter(Boolean) as string[],
    ),
  ];

  const profiles =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [], error: null };
  if (profiles.error) fail("profiles", profiles.error.message);

  const names = new Map(
    ((profiles.data ?? []) as { id: string; full_name: string | null }[]).map((row) => [
      row.id,
      row.full_name ?? "Member",
    ]),
  );

  return rows.map((row) => {
    const entry = entryRows.get(row.entry_id);
    return {
      ...row,
      entryLabel: entry?.offeringLabel ?? "Entry",
      entryDay: entry?.day_of_week ?? 1,
      entryStartsAt: entry?.starts_at ?? "00:00:00",
      entryEndsAt: entry?.ends_at ?? "00:00:00",
      roomName: entry?.roomName ?? "—",
      requesterName: row.requested_by ? names.get(row.requested_by) ?? "Member" : "System",
      reviewerName: row.reviewed_by ? names.get(row.reviewed_by) ?? "Member" : null,
    };
  });
}

export async function pendingRequestForEntry(institutionId: string, entryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timetable_change_requests")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("entry_id", entryId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (error) fail("change request", error.message);
  return (data as TimetableChangeRequestRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
export async function entriesForScope(
  institutionId: string,
  params: { semesterId: string; view: "department" | "faculty" | "lecturer" | "group" | "room"; id: string },
) {
  const live = await liveVersion(institutionId, params.semesterId);
  if (!live) return { version: null, entries: [] as TimetableEntryDetail[] };

  const supabase = await createClient();
  let query = supabase
    .from("timetable_entries")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("version_id", live.id);

  if (params.view === "department") query = query.eq("department_id", params.id);
  if (params.view === "lecturer") query = query.eq("lecturer_id", params.id);
  if (params.view === "group") query = query.eq("group_id", params.id);
  if (params.view === "room") query = query.eq("room_id", params.id);

  if (params.view === "faculty") {
    const departments = await supabase
      .from("departments")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("faculty_id", params.id);
    if (departments.error) fail("departments", departments.error.message);
    const ids = ((departments.data ?? []) as { id: string }[]).map((row) => row.id);
    if (ids.length === 0) return { version: live, entries: [] as TimetableEntryDetail[] };
    query = query.in("department_id", ids);
  }

  const outcome = await query.order("day_of_week").order("starts_at");
  if (outcome.error) fail("timetable view", outcome.error.message);

  const maps = await entryMaps(supabase, institutionId);
  return {
    version: live,
    entries: decorate((outcome.data ?? []) as TimetableEntryRow[], maps),
  };
}

export async function lecturerPublishedEntries(
  institutionId: string,
  userId: string,
  semesterId: string,
) {
  const supabase = await createClient();
  const lecturer = await supabase
    .from("lecturers")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (lecturer.error) fail("lecturer record", lecturer.error.message);
  if (!lecturer.data?.id) return { lecturerId: null, entries: [] as TimetableEntryDetail[] };

  const live = await liveVersion(institutionId, semesterId);
  if (!live) return { lecturerId: lecturer.data.id as string, entries: [] as TimetableEntryDetail[] };

  const outcome = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("version_id", live.id)
    .eq("lecturer_id", lecturer.data.id)
    .order("day_of_week")
    .order("starts_at");

  if (outcome.error) fail("personal timetable", outcome.error.message);
  const maps = await entryMaps(supabase, institutionId);
  return {
    lecturerId: lecturer.data.id as string,
    entries: decorate((outcome.data ?? []) as TimetableEntryRow[], maps),
  };
}

export async function studentPublishedEntries(
  institutionId: string,
  userId: string,
  semesterId: string,
) {
  const supabase = await createClient();
  const student = await supabase
    .from("students")
    .select("id")
    .eq("institution_id", institutionId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (student.error) fail("student record", student.error.message);
  if (!student.data?.id) return { entries: [] as TimetableEntryDetail[] };

  const memberships = await supabase
    .from("student_group_members")
    .select("group_id")
    .eq("institution_id", institutionId)
    .eq("student_id", student.data.id)
    .is("archived_at", null);
  if (memberships.error) fail("student groups", memberships.error.message);

  const groupIds = ((memberships.data ?? []) as { group_id: string }[]).map((row) => row.group_id);
  if (groupIds.length === 0) return { entries: [] as TimetableEntryDetail[] };

  const live = await liveVersion(institutionId, semesterId);
  if (!live) return { entries: [] as TimetableEntryDetail[] };

  const outcome = await supabase
    .from("timetable_entries")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("version_id", live.id)
    .in("group_id", groupIds)
    .order("day_of_week")
    .order("starts_at");

  if (outcome.error) fail("personal timetable", outcome.error.message);
  const maps = await entryMaps(supabase, institutionId);
  return { entries: decorate((outcome.data ?? []) as TimetableEntryRow[], maps) };
}
