import { PAGE_SIZE } from "@/lib/academics/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  AcademicSessionRow,
  CalendarEventRow,
  CampusRow,
  CourseOfferingGroupRow,
  CourseOfferingLecturerRow,
  CourseOfferingRow,
  CourseRow,
  DepartmentRow,
  FacultyRow,
  LecturerRow,
  ProgrammeCourseRow,
  ProgrammeRow,
  SemesterRow,
  StudentGroupMemberRow,
  StudentGroupRow,
  StudentRow,
} from "@/types/database";

export type AcademicListParams = {
  q?: string;
  archived?: boolean;
  page?: number;
};

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
};

export type FacultyListItem = FacultyRow & {
  campusName: string | null;
};

export type DepartmentListItem = DepartmentRow & {
  facultyName: string;
  campusName: string | null;
};

export type SemesterListItem = SemesterRow & {
  sessionName: string;
};

export type ProgrammeListItem = ProgrammeRow & {
  departmentName: string;
  facultyName: string;
};

export type CourseListItem = CourseRow & {
  departmentName: string;
  facultyName: string;
};

export type CurriculumListItem = ProgrammeCourseRow & {
  programmeCode: string;
  programmeName: string;
  courseCode: string;
  courseTitle: string;
};

type QueryOutcome<T> = {
  data: T[] | null;
  count: number | null;
  error: { message: string } | null;
};

function fail(scope: string, message: string): never {
  console.error(`[academics] ${scope}`, message);
  throw new Error(`Could not load ${scope}. ${message}`);
}

/** PostgREST splits `.or()` on commas, so user input must not contain them. */
function term(q?: string) {
  return (q ?? "").trim().replace(/[,()*"\\]/g, " ").slice(0, 60);
}

function pageOf(params: AcademicListParams) {
  const page = Number.isInteger(params.page) && (params.page ?? 0) > 0 ? (params.page as number) : 1;
  return { page, from: (page - 1) * PAGE_SIZE, to: page * PAGE_SIZE - 1 };
}

function shape<T>(scope: string, outcome: QueryOutcome<T>, page: number): Paged<T> {
  if (outcome.error) fail(scope, outcome.error.message);
  const total = outcome.count ?? outcome.data?.length ?? 0;
  return {
    rows: outcome.data ?? [],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

// ---------------------------------------------------------------------------
// Campuses
// ---------------------------------------------------------------------------
export async function listCampuses(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<CampusRow>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("campuses")
    .select("id, institution_id, name, code, address, archived_at, created_at, updated_at", {
      count: "exact",
    })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);

  const outcome = await query.order("name").range(from, to);
  return shape("campuses", outcome, page);
}

export async function getCampus(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campuses")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("campus", error.message);
  return (data as CampusRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Faculties
// ---------------------------------------------------------------------------
export async function listFaculties(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<FacultyListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("faculties")
    .select("*, campuses ( name )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);

  const { data, count, error } = await query.order("name").range(from, to);
  if (error) fail("faculties", error.message);

  const rows = (data ?? []) as unknown as (FacultyRow & {
    campuses: { name: string } | null;
  })[];

  return {
    ...shape(
      "faculties",
      {
        data: rows.map((row) => ({ ...row, campusName: row.campuses?.name ?? null })),
        count,
        error: null,
      },
      page,
    ),
  };
}

export async function getFaculty(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faculties")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("faculty", error.message);
  return (data as FacultyRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
export async function listDepartments(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<DepartmentListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("departments")
    .select("*, faculties ( name, campuses ( name ) )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);

  const { data, count, error } = await query.order("name").range(from, to);
  if (error) fail("departments", error.message);

  const rows = (data ?? []) as unknown as (DepartmentRow & {
    faculties: { name: string; campuses: { name: string } | null } | null;
  })[];

  return shape(
    "departments",
    {
      data: rows.map((row) => ({
        ...row,
        facultyName: row.faculties?.name ?? "—",
        campusName: row.faculties?.campuses?.name ?? null,
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getDepartment(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("department", error.message);
  return (data as DepartmentRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Academic sessions
// ---------------------------------------------------------------------------
export async function listSessions(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<AcademicSessionRow>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("academic_sessions")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.ilike("name", `%${q}%`);

  const outcome = await query.order("starts_on", { ascending: false }).range(from, to);
  return shape("academic sessions", outcome as QueryOutcome<AcademicSessionRow>, page);
}

export async function getSession(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_sessions")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("academic session", error.message);
  return (data as AcademicSessionRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Semesters
// ---------------------------------------------------------------------------
export async function listSemesters(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<SemesterListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("semesters")
    .select("*, academic_sessions ( name )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, count, error } = await query.order("teaching_starts_on", { ascending: false }).range(from, to);
  if (error) fail("semesters", error.message);

  const rows = (data ?? []) as unknown as (SemesterRow & {
    academic_sessions: { name: string } | null;
  })[];

  return shape(
    "semesters",
    {
      data: rows.map((row) => ({
        ...row,
        sessionName: row.academic_sessions?.name ?? "—",
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getSemester(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("semesters")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("semester", error.message);
  return (data as SemesterRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------
export async function listProgrammes(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<ProgrammeListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("programmes")
    .select("*, departments ( name, faculties ( name ) )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);

  const { data, count, error } = await query.order("name").range(from, to);
  if (error) fail("programmes", error.message);

  const rows = (data ?? []) as unknown as (ProgrammeRow & {
    departments: { name: string; faculties: { name: string } | null } | null;
  })[];

  return shape(
    "programmes",
    {
      data: rows.map((row) => ({
        ...row,
        departmentName: row.departments?.name ?? "—",
        facultyName: row.departments?.faculties?.name ?? "—",
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getProgramme(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programmes")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("programme", error.message);
  return (data as ProgrammeRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------
export async function listCourses(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<CourseListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("courses")
    .select("*, departments ( name, faculties ( name ) )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`title.ilike.%${q}%,code.ilike.%${q}%`);

  const { data, count, error } = await query.order("code").range(from, to);
  if (error) fail("courses", error.message);

  const rows = (data ?? []) as unknown as (CourseRow & {
    departments: { name: string; faculties: { name: string } | null } | null;
  })[];

  return shape(
    "courses",
    {
      data: rows.map((row) => ({
        ...row,
        departmentName: row.departments?.name ?? "—",
        facultyName: row.departments?.faculties?.name ?? "—",
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getCourse(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("course", error.message);
  return (data as CourseRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Programme curriculum
// ---------------------------------------------------------------------------
export async function listCurriculum(
  institutionId: string,
  params: AcademicListParams = {},
): Promise<Paged<CurriculumListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);

  let query = supabase
    .from("programme_courses")
    .select("*, programmes ( code, name ), courses ( code, title )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  const { data, count, error } = await query.order("level").range(from, to);
  if (error) fail("curriculum", error.message);

  const rows = (data ?? []) as unknown as (ProgrammeCourseRow & {
    programmes: { code: string; name: string } | null;
    courses: { code: string; title: string } | null;
  })[];

  return shape(
    "curriculum",
    {
      data: rows.map((row) => ({
        ...row,
        programmeCode: row.programmes?.code ?? "—",
        programmeName: row.programmes?.name ?? "—",
        courseCode: row.courses?.code ?? "—",
        courseTitle: row.courses?.title ?? "—",
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getCurriculumEntry(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programme_courses")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("curriculum entry", error.message);
  return (data as ProgrammeCourseRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
export type StudentListItem = StudentRow & {
  programmeCode: string;
  programmeName: string;
  entrySessionName: string | null;
};

export async function listStudents(
  institutionId: string,
  params: AcademicListParams & { programmeId?: string; level?: number } = {},
): Promise<Paged<StudentListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("students")
    .select("*, programmes ( code, name ), academic_sessions ( name )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) {
    query = query.or(
      `matric_number.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }
  if (params.programmeId) query = query.eq("programme_id", params.programmeId);
  if (params.level) query = query.eq("level", params.level);

  const { data, count, error } = await query
    .order("last_name")
    .order("first_name")
    .range(from, to);
  if (error) fail("students", error.message);

  const rows = (data ?? []) as unknown as (StudentRow & {
    programmes: { code: string; name: string } | null;
    academic_sessions: { name: string } | null;
  })[];

  return shape(
    "students",
    {
      data: rows.map((row) => ({
        ...row,
        programmeCode: row.programmes?.code ?? "—",
        programmeName: row.programmes?.name ?? "—",
        entrySessionName: row.academic_sessions?.name ?? null,
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getStudent(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("student", error.message);
  return (data as StudentRow | null) ?? null;
}

/**
 * Which of the file's identifiers are already stored. Only the identifiers in
 * the file are queried, in chunks, so a server-side row cap cannot hide a
 * duplicate from the dry run.
 */
export async function existingIdentifiers(
  institutionId: string,
  entity: "student" | "lecturer",
  identifiers: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  if (identifiers.length === 0) return found;

  const supabase = await createClient();
  const column = entity === "student" ? "matric_number" : "staff_number";
  const table = entity === "student" ? "students" : "lecturers";

  for (let index = 0; index < identifiers.length; index += 100) {
    const chunk = identifiers.slice(index, index + 100);
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .eq("institution_id", institutionId)
      .in(column, chunk);
    if (error) fail(`${entity} identifiers`, error.message);

    for (const row of (data ?? []) as unknown as Record<string, string>[]) {
      found.add(String(row[column] ?? "").toUpperCase());
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Lecturers
// ---------------------------------------------------------------------------
export type LecturerListItem = LecturerRow & {
  departmentName: string;
  facultyName: string;
};

export async function listLecturers(
  institutionId: string,
  params: AcademicListParams & { departmentId?: string } = {},
): Promise<Paged<LecturerListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("lecturers")
    .select("*, departments ( name, faculties ( name ) )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) {
    query = query.or(
      `staff_number.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }
  if (params.departmentId) query = query.eq("department_id", params.departmentId);

  const { data, count, error } = await query
    .order("last_name")
    .order("first_name")
    .range(from, to);
  if (error) fail("lecturers", error.message);

  const rows = (data ?? []) as unknown as (LecturerRow & {
    departments: { name: string; faculties: { name: string } | null } | null;
  })[];

  return shape(
    "lecturers",
    {
      data: rows.map((row) => ({
        ...row,
        departmentName: row.departments?.name ?? "—",
        facultyName: row.departments?.faculties?.name ?? "—",
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getLecturer(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lecturers")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("lecturer", error.message);
  return (data as LecturerRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Student groups
// ---------------------------------------------------------------------------
export type StudentGroupListItem = StudentGroupRow & {
  programmeCode: string;
  programmeName: string;
  sessionName: string;
  memberCount: number;
};

export async function listStudentGroups(
  institutionId: string,
  params: AcademicListParams & { sessionId?: string } = {},
): Promise<Paged<StudentGroupListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("student_groups")
    .select("*, programmes ( code, name ), academic_sessions ( name )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
  if (params.sessionId) query = query.eq("session_id", params.sessionId);

  const { data, count, error } = await query.order("name").range(from, to);
  if (error) fail("student groups", error.message);

  const rows = (data ?? []) as unknown as (StudentGroupRow & {
    programmes: { code: string; name: string } | null;
    academic_sessions: { name: string } | null;
  })[];

  const ids = rows.map((row) => row.id);
  const memberCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: members, error: memberError } = await supabase
      .from("student_group_members")
      .select("group_id")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .in("group_id", ids);
    if (memberError) fail("group members", memberError.message);
    for (const member of (members ?? []) as unknown as { group_id: string }[]) {
      memberCounts.set(member.group_id, (memberCounts.get(member.group_id) ?? 0) + 1);
    }
  }

  return shape(
    "student groups",
    {
      data: rows.map((row) => ({
        ...row,
        programmeCode: row.programmes?.code ?? "—",
        programmeName: row.programmes?.name ?? "—",
        sessionName: row.academic_sessions?.name ?? "—",
        memberCount: memberCounts.get(row.id) ?? 0,
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getStudentGroup(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_groups")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("student group", error.message);
  return (data as StudentGroupRow | null) ?? null;
}

export type GroupMemberListItem = StudentGroupMemberRow & {
  studentName: string;
  matricNumber: string;
  studentLevel: number;
};

export async function listGroupMembers(
  institutionId: string,
  params: AcademicListParams & { groupId?: string } = {},
): Promise<Paged<GroupMemberListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);

  let query = supabase
    .from("student_group_members")
    .select("*, students ( first_name, last_name, matric_number, level )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (params.groupId) query = query.eq("group_id", params.groupId);

  const { data, count, error } = await query.order("created_at").range(from, to);
  if (error) fail("group members", error.message);

  const rows = (data ?? []) as unknown as (StudentGroupMemberRow & {
    students: {
      first_name: string;
      last_name: string;
      matric_number: string;
      level: number;
    } | null;
  })[];

  return shape(
    "group members",
    {
      data: rows.map((row) => ({
        ...row,
        studentName: row.students
          ? `${row.students.first_name} ${row.students.last_name}`
          : "—",
        matricNumber: row.students?.matric_number ?? "—",
        studentLevel: row.students?.level ?? 0,
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getGroupMember(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_group_members")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("group member", error.message);
  return (data as StudentGroupMemberRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Course offerings
// ---------------------------------------------------------------------------
export type OfferingListItem = CourseOfferingRow & {
  courseCode: string;
  courseTitle: string;
  courseUnits: number;
  departmentName: string;
  sessionName: string;
  semesterName: string;
  semesterSequence: number;
  coordinatorName: string | null;
  lecturerCount: number;
  groupCount: number;
};

export async function listOfferings(
  institutionId: string,
  params: AcademicListParams & { semesterId?: string } = {},
): Promise<Paged<OfferingListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("course_offerings")
    .select(
      "*, courses ( code, title, units, departments ( name ) ), academic_sessions ( name ), semesters ( name, sequence ), lecturers ( title, first_name, last_name )",
      { count: "exact" },
    )
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) {
    const { data: matches, error: matchError } = await supabase
      .from("courses")
      .select("id")
      .eq("institution_id", institutionId)
      .or(`code.ilike.%${q}%,title.ilike.%${q}%`)
      .limit(200);
    if (matchError) fail("offering search", matchError.message);
    const courseIds = ((matches ?? []) as unknown as { id: string }[]).map((row) => row.id);
    query = query.in(
      "course_id",
      courseIds.length > 0 ? courseIds : ["00000000-0000-0000-0000-000000000000"],
    );
  }
  if (params.semesterId) query = query.eq("semester_id", params.semesterId);

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) fail("course offerings", error.message);

  const rows = (data ?? []) as unknown as (CourseOfferingRow & {
    courses: { code: string; title: string; units: number; departments: { name: string } | null } | null;
    academic_sessions: { name: string } | null;
    semesters: { name: string; sequence: number } | null;
    lecturers: { title: string | null; first_name: string; last_name: string } | null;
  })[];

  const ids = rows.map((row) => row.id);
  const lecturerCounts = new Map<string, number>();
  const groupCounts = new Map<string, number>();

  if (ids.length > 0) {
    const [assigned, linked] = await Promise.all([
      supabase
        .from("course_offering_lecturers")
        .select("offering_id")
        .eq("institution_id", institutionId)
        .is("archived_at", null)
        .in("offering_id", ids),
      supabase
        .from("course_offering_groups")
        .select("offering_id")
        .eq("institution_id", institutionId)
        .is("archived_at", null)
        .in("offering_id", ids),
    ]);
    if (assigned.error) fail("offering lecturers", assigned.error.message);
    if (linked.error) fail("offering groups", linked.error.message);

    for (const row of (assigned.data ?? []) as unknown as { offering_id: string }[]) {
      lecturerCounts.set(row.offering_id, (lecturerCounts.get(row.offering_id) ?? 0) + 1);
    }
    for (const row of (linked.data ?? []) as unknown as { offering_id: string }[]) {
      groupCounts.set(row.offering_id, (groupCounts.get(row.offering_id) ?? 0) + 1);
    }
  }

  return shape(
    "course offerings",
    {
      data: rows.map((row) => ({
        ...row,
        courseCode: row.courses?.code ?? "—",
        courseTitle: row.courses?.title ?? "—",
        courseUnits: row.courses?.units ?? 0,
        departmentName: row.courses?.departments?.name ?? "—",
        sessionName: row.academic_sessions?.name ?? "—",
        semesterName: row.semesters?.name ?? "—",
        semesterSequence: row.semesters?.sequence ?? 0,
        coordinatorName: row.lecturers
          ? [row.lecturers.title, row.lecturers.first_name, row.lecturers.last_name]
              .filter(Boolean)
              .join(" ")
          : null,
        lecturerCount: lecturerCounts.get(row.id) ?? 0,
        groupCount: groupCounts.get(row.id) ?? 0,
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getOffering(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("course offering", error.message);
  return (data as CourseOfferingRow | null) ?? null;
}

export type OfferingLecturerListItem = CourseOfferingLecturerRow & {
  lecturerName: string;
  staffNumber: string;
  offeringLabel: string;
};

export async function listOfferingLecturers(
  institutionId: string,
  params: AcademicListParams & { offeringId?: string } = {},
): Promise<Paged<OfferingLecturerListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);

  let query = supabase
    .from("course_offering_lecturers")
    .select(
      "*, lecturers ( title, first_name, last_name, staff_number ), course_offerings ( courses ( code ) )",
      { count: "exact" },
    )
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (params.offeringId) query = query.eq("offering_id", params.offeringId);

  const { data, count, error } = await query.order("created_at").range(from, to);
  if (error) fail("offering lecturers", error.message);

  const rows = (data ?? []) as unknown as (CourseOfferingLecturerRow & {
    lecturers: {
      title: string | null;
      first_name: string;
      last_name: string;
      staff_number: string;
    } | null;
    course_offerings: { courses: { code: string } | null } | null;
  })[];

  return shape(
    "offering lecturers",
    {
      data: rows.map((row) => ({
        ...row,
        lecturerName: row.lecturers
          ? [row.lecturers.title, row.lecturers.first_name, row.lecturers.last_name]
              .filter(Boolean)
              .join(" ")
          : "—",
        staffNumber: row.lecturers?.staff_number ?? "—",
        offeringLabel: row.course_offerings?.courses?.code ?? "—",
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getOfferingLecturer(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offering_lecturers")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("offering lecturer", error.message);
  return (data as CourseOfferingLecturerRow | null) ?? null;
}

export type OfferingGroupListItem = CourseOfferingGroupRow & {
  groupName: string;
  groupCode: string;
  offeringLabel: string;
};

export async function listOfferingGroups(
  institutionId: string,
  params: AcademicListParams & { offeringId?: string } = {},
): Promise<Paged<OfferingGroupListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);

  let query = supabase
    .from("course_offering_groups")
    .select(
      "*, student_groups ( name, code ), course_offerings ( courses ( code ) )",
      { count: "exact" },
    )
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (params.offeringId) query = query.eq("offering_id", params.offeringId);

  const { data, count, error } = await query.order("created_at").range(from, to);
  if (error) fail("offering groups", error.message);

  const rows = (data ?? []) as unknown as (CourseOfferingGroupRow & {
    student_groups: { name: string; code: string } | null;
    course_offerings: { courses: { code: string } | null } | null;
  })[];

  return shape(
    "offering groups",
    {
      data: rows.map((row) => ({
        ...row,
        groupName: row.student_groups?.name ?? "—",
        groupCode: row.student_groups?.code ?? "—",
        offeringLabel: row.course_offerings?.courses?.code ?? "—",
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getOfferingGroup(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offering_groups")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("offering group", error.message);
  return (data as CourseOfferingGroupRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Academic calendar
// ---------------------------------------------------------------------------
export type CalendarEventListItem = CalendarEventRow & {
  sessionName: string;
  semesterName: string | null;
};

export async function listCalendarEvents(
  institutionId: string,
  params: AcademicListParams & { sessionId?: string } = {},
): Promise<Paged<CalendarEventListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("calendar_events")
    .select("*, academic_sessions ( name ), semesters ( name )", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (params.sessionId) query = query.eq("session_id", params.sessionId);

  const { data, count, error } = await query.order("starts_on").range(from, to);
  if (error) fail("calendar events", error.message);

  const rows = (data ?? []) as unknown as (CalendarEventRow & {
    academic_sessions: { name: string } | null;
    semesters: { name: string } | null;
  })[];

  return shape(
    "calendar events",
    {
      data: rows.map((row) => ({
        ...row,
        sessionName: row.academic_sessions?.name ?? "—",
        semesterName: row.semesters?.name ?? null,
      })),
      count,
      error: null,
    },
    page,
  );
}

export async function getCalendarEvent(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("calendar event", error.message);
  return (data as CalendarEventRow | null) ?? null;
}

/** All live events for a session, used to derive teaching weeks. */
export async function sessionCalendarEvents(institutionId: string, sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("session_id", sessionId)
    .is("archived_at", null);
  if (error) fail("session calendar", error.message);
  return (data ?? []) as CalendarEventRow[];
}

// ---------------------------------------------------------------------------
// Lookups and summary
// ---------------------------------------------------------------------------
export type AcademicLookups = {
  campuses: { id: string; name: string; code: string }[];
  faculties: { id: string; name: string; code: string }[];
  departments: { id: string; name: string; code: string; facultyName: string }[];
  sessions: { id: string; name: string }[];
  programmes: { id: string; name: string; code: string }[];
  courses: { id: string; title: string; code: string }[];
  semesters: { id: string; name: string; sequence: number; sessionId: string; sessionName: string }[];
  lecturers: { id: string; name: string; staffNumber: string; departmentName: string }[];
  groups: {
    id: string;
    name: string;
    code: string;
    programmeCode: string;
    level: number;
    sessionName: string;
  }[];
  /** A capped roster for the group-membership picker, ordered by surname. */
  students: { id: string; name: string; matricNumber: string; programmeCode: string; level: number }[];
  offerings: { id: string; label: string }[];
};

export async function academicLookups(institutionId: string): Promise<AcademicLookups> {
  const supabase = await createClient();

  const [
    campuses,
    faculties,
    departments,
    sessions,
    programmes,
    courses,
    semesters,
    lecturers,
    groups,
    students,
    offerings,
  ] = await Promise.all([
    supabase
      .from("campuses")
      .select("id, name, code")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("faculties")
      .select("id, name, code")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name, code, faculties ( name )")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("academic_sessions")
      .select("id, name")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("starts_on", { ascending: false }),
    supabase
      .from("programmes")
      .select("id, name, code")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("courses")
      .select("id, title, code")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("code"),
    supabase
      .from("semesters")
      .select("id, name, sequence, session_id, academic_sessions ( name )")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("teaching_starts_on", { ascending: false }),
    supabase
      .from("lecturers")
      .select("id, title, first_name, last_name, staff_number, departments ( name )")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("last_name"),
    supabase
      .from("student_groups")
      .select("id, name, code, level, programmes ( code ), academic_sessions ( name )")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("students")
      .select("id, first_name, last_name, matric_number, level, programmes ( code )")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("last_name")
      .limit(500),
    supabase
      .from("course_offerings")
      .select("id, courses ( code, title ), academic_sessions ( name ), semesters ( name, sequence )")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  for (const outcome of [
    campuses,
    faculties,
    departments,
    sessions,
    programmes,
    courses,
    semesters,
    lecturers,
    groups,
    students,
    offerings,
  ]) {
    if (outcome.error) fail("academic lookups", outcome.error.message);
  }

  const departmentRows = (departments.data ?? []) as unknown as {
    id: string;
    name: string;
    code: string;
    faculties: { name: string } | null;
  }[];

  const semesterRows = (semesters.data ?? []) as unknown as {
    id: string;
    name: string;
    sequence: number;
    session_id: string;
    academic_sessions: { name: string } | null;
  }[];
  const lecturerRows = (lecturers.data ?? []) as unknown as {
    id: string;
    title: string | null;
    first_name: string;
    last_name: string;
    staff_number: string;
    departments: { name: string } | null;
  }[];
  const groupRows = (groups.data ?? []) as unknown as {
    id: string;
    name: string;
    code: string;
    level: number;
    programmes: { code: string } | null;
    academic_sessions: { name: string } | null;
  }[];
  const studentRows = (students.data ?? []) as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    matric_number: string;
    level: number;
    programmes: { code: string } | null;
  }[];

  const offeringRows = (offerings.data ?? []) as unknown as {
    id: string;
    courses: { code: string; title: string } | null;
    academic_sessions: { name: string } | null;
    semesters: { name: string; sequence: number } | null;
  }[];

  return {
    campuses: campuses.data ?? [],
    faculties: faculties.data ?? [],
    departments: departmentRows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      facultyName: row.faculties?.name ?? "—",
    })),
    sessions: sessions.data ?? [],
    programmes: programmes.data ?? [],
    courses: courses.data ?? [],
    semesters: semesterRows.map((row) => ({
      id: row.id,
      name: row.name,
      sequence: row.sequence,
      sessionId: row.session_id,
      sessionName: row.academic_sessions?.name ?? "—",
    })),
    lecturers: lecturerRows.map((row) => ({
      id: row.id,
      name: [row.title, row.first_name, row.last_name].filter(Boolean).join(" "),
      staffNumber: row.staff_number,
      departmentName: row.departments?.name ?? "—",
    })),
    groups: groupRows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      programmeCode: row.programmes?.code ?? "—",
      level: row.level,
      sessionName: row.academic_sessions?.name ?? "—",
    })),
    students: studentRows.map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      matricNumber: row.matric_number,
      programmeCode: row.programmes?.code ?? "—",
      level: row.level,
    })),
    offerings: offeringRows.map((row) => ({
      id: row.id,
      label: [
        row.courses?.code,
        row.academic_sessions?.name,
        row.semesters ? `${row.semesters.sequence}. ${row.semesters.name}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}

export type AcademicSummary = {
  campuses: number;
  faculties: number;
  departments: number;
  sessions: number;
  semesters: number;
  programmes: number;
  courses: number;
  archivedCourses: number;
  students: number;
  lecturers: number;
  groups: number;
  offerings: number;
  calendarEvents: number;
};

export async function academicSummary(institutionId: string): Promise<AcademicSummary> {
  const supabase = await createClient();

  const count = async (
    table:
      | "campuses"
      | "faculties"
      | "departments"
      | "academic_sessions"
      | "semesters"
      | "programmes"
      | "courses"
      | "students"
      | "lecturers"
      | "student_groups"
      | "course_offerings"
      | "calendar_events",
    archived = false,
  ) => {
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId);
    query = archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null);
    const { count: total, error } = await query;
    if (error) fail(`summary (${table})`, error.message);
    return total ?? 0;
  };

  const [
    campuses,
    faculties,
    departments,
    sessions,
    semesters,
    programmes,
    courses,
    archivedCourses,
    students,
    lecturers,
    groups,
    offerings,
    calendarEvents,
  ] = await Promise.all([
    count("campuses"),
    count("faculties"),
    count("departments"),
    count("academic_sessions"),
    count("semesters"),
    count("programmes"),
    count("courses"),
    count("courses", true),
    count("students"),
    count("lecturers"),
    count("student_groups"),
    count("course_offerings"),
    count("calendar_events"),
  ]);

  return {
    campuses,
    faculties,
    departments,
    sessions,
    semesters,
    programmes,
    courses,
    archivedCourses,
    students,
    lecturers,
    groups,
    offerings,
    calendarEvents,
  };
}
