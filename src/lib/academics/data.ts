import { PAGE_SIZE } from "@/lib/academics/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  AcademicSessionRow,
  CampusRow,
  CourseRow,
  DepartmentRow,
  FacultyRow,
  ProgrammeCourseRow,
  ProgrammeRow,
  SemesterRow,
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
// Lookups and summary
// ---------------------------------------------------------------------------
export type AcademicLookups = {
  campuses: { id: string; name: string; code: string }[];
  faculties: { id: string; name: string; code: string }[];
  departments: { id: string; name: string; code: string; facultyName: string }[];
  sessions: { id: string; name: string }[];
  programmes: { id: string; name: string; code: string }[];
  courses: { id: string; title: string; code: string }[];
};

export async function academicLookups(institutionId: string): Promise<AcademicLookups> {
  const supabase = await createClient();

  const [campuses, faculties, departments, sessions, programmes, courses] = await Promise.all([
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
  ]);

  for (const outcome of [campuses, faculties, departments, sessions, programmes, courses]) {
    if (outcome.error) fail("academic lookups", outcome.error.message);
  }

  const departmentRows = (departments.data ?? []) as unknown as {
    id: string;
    name: string;
    code: string;
    faculties: { name: string } | null;
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
};

export async function academicSummary(institutionId: string): Promise<AcademicSummary> {
  const supabase = await createClient();

  const count = async (table: "campuses" | "faculties" | "departments" | "academic_sessions" | "semesters" | "programmes" | "courses", archived = false) => {
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

  const [campuses, faculties, departments, sessions, semesters, programmes, courses, archivedCourses] =
    await Promise.all([
      count("campuses"),
      count("faculties"),
      count("departments"),
      count("academic_sessions"),
      count("semesters"),
      count("programmes"),
      count("courses"),
      count("courses", true),
    ]);

  return { campuses, faculties, departments, sessions, semesters, programmes, courses, archivedCourses };
}
