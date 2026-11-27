import type {
  AcademicPeriodStatus,
  CurriculumRequirement,
  ProgrammeLevel,
  RoomType,
} from "@/types/database";

/** Academic entities the administration screen can create, edit and archive. */
export type AcademicEntity =
  | "campus"
  | "faculty"
  | "department"
  | "session"
  | "semester"
  | "programme"
  | "course"
  | "curriculum";

export type AcademicEntityConfig = {
  label: string;
  singular: string;
  path: string;
  /** Table name in the generated database types. */
  table:
    | "campuses"
    | "faculties"
    | "departments"
    | "academic_sessions"
    | "semesters"
    | "programmes"
    | "courses"
    | "programme_courses";
  /** Capability needed to reach the screen. */
  capability: "manage_academics";
};

export const ACADEMIC_ENTITIES: Record<AcademicEntity, AcademicEntityConfig> = {
  campus: {
    label: "Campuses",
    singular: "Campus",
    path: "/institution/academics/campuses",
    table: "campuses",
    capability: "manage_academics",
  },
  faculty: {
    label: "Faculties",
    singular: "Faculty",
    path: "/institution/academics/faculties",
    table: "faculties",
    capability: "manage_academics",
  },
  department: {
    label: "Departments",
    singular: "Department",
    path: "/institution/academics/departments",
    table: "departments",
    capability: "manage_academics",
  },
  session: {
    label: "Academic sessions",
    singular: "Session",
    path: "/institution/academics/sessions",
    table: "academic_sessions",
    capability: "manage_academics",
  },
  semester: {
    label: "Semesters",
    singular: "Semester",
    path: "/institution/academics/sessions",
    table: "semesters",
    capability: "manage_academics",
  },
  programme: {
    label: "Programmes",
    singular: "Programme",
    path: "/institution/academics/programmes",
    table: "programmes",
    capability: "manage_academics",
  },
  course: {
    label: "Courses",
    singular: "Course",
    path: "/institution/academics/courses",
    table: "courses",
    capability: "manage_academics",
  },
  curriculum: {
    label: "Programme curriculum",
    singular: "Curriculum entry",
    path: "/institution/academics/courses",
    table: "programme_courses",
    capability: "manage_academics",
  },
};

export function isAcademicEntity(value: string): value is AcademicEntity {
  return Object.prototype.hasOwnProperty.call(ACADEMIC_ENTITIES, value);
}

export const PAGE_SIZE = 20;

export const PROGRAMME_LEVELS: readonly ProgrammeLevel[] = [
  "undergraduate",
  "postgraduate",
  "diploma",
  "certificate",
];

export const ROOM_TYPES: readonly RoomType[] = [
  "classroom",
  "lecture_hall",
  "laboratory",
  "studio",
  "seminar",
];

export const CURRICULUM_REQUIREMENTS: readonly CurriculumRequirement[] = [
  "required",
  "elective",
];

export const PERIOD_STATUSES: readonly AcademicPeriodStatus[] = [
  "planned",
  "active",
  "closed",
];

/** Course and curriculum levels, in the order a student meets them. */
export const LEVEL_OPTIONS: readonly number[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function labelForValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
