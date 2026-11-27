import type {
  AcademicPeriodStatus,
  CalendarEventKind,
  CurriculumRequirement,
  LecturerStatus,
  OfferingStatus,
  ProgrammeLevel,
  RoomType,
  StudentStatus,
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
  | "curriculum"
  | "student"
  | "lecturer"
  | "group"
  | "groupMember"
  | "offering"
  | "offeringLecturer"
  | "offeringGroup"
  | "calendarEvent";

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
    | "programme_courses"
    | "students"
    | "lecturers"
    | "student_groups"
    | "student_group_members"
    | "course_offerings"
    | "course_offering_lecturers"
    | "course_offering_groups"
    | "calendar_events";
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
  student: {
    label: "Students",
    singular: "Student",
    path: "/institution/academics/students",
    table: "students",
    capability: "manage_academics",
  },
  lecturer: {
    label: "Lecturers",
    singular: "Lecturer",
    path: "/institution/academics/lecturers",
    table: "lecturers",
    capability: "manage_academics",
  },
  group: {
    label: "Student groups",
    singular: "Student group",
    path: "/institution/academics/groups",
    table: "student_groups",
    capability: "manage_academics",
  },
  groupMember: {
    label: "Group members",
    singular: "Group member",
    path: "/institution/academics/groups",
    table: "student_group_members",
    capability: "manage_academics",
  },
  offering: {
    label: "Course offerings",
    singular: "Course offering",
    path: "/institution/academics/offerings",
    table: "course_offerings",
    capability: "manage_academics",
  },
  offeringLecturer: {
    label: "Offering lecturers",
    singular: "Lecturer assignment",
    path: "/institution/academics/offerings",
    table: "course_offering_lecturers",
    capability: "manage_academics",
  },
  offeringGroup: {
    label: "Offering groups",
    singular: "Offering group",
    path: "/institution/academics/offerings",
    table: "course_offering_groups",
    capability: "manage_academics",
  },
  calendarEvent: {
    label: "Academic calendar",
    singular: "Calendar event",
    path: "/institution/academics/calendar",
    table: "calendar_events",
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

export const STUDENT_STATUSES: readonly StudentStatus[] = [
  "active",
  "graduated",
  "withdrawn",
  "suspended",
];

export const LECTURER_STATUSES: readonly LecturerStatus[] = [
  "active",
  "on_leave",
  "retired",
];

export const OFFERING_STATUSES: readonly OfferingStatus[] = [
  "planned",
  "open",
  "closed",
];

export const CALENDAR_EVENT_KINDS: readonly CalendarEventKind[] = [
  "holiday",
  "registration",
  "teaching",
  "examination",
  "deadline",
  "event",
];

export const ASSIGNMENT_ROLES = ["lead", "assistant"] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

/** CSV headers accepted by the import, in the order shown to the user. */
export const STUDENT_IMPORT_COLUMNS = [
  "matric_number",
  "first_name",
  "last_name",
  "programme_code",
  "level",
  "email",
  "phone",
  "entry_session",
  "status",
] as const;

export const LECTURER_IMPORT_COLUMNS = [
  "staff_number",
  "first_name",
  "last_name",
  "department_code",
  "title",
  "email",
  "phone",
  "status",
] as const;

export type ImportableEntity = "student" | "lecturer";

/** Course and curriculum levels, in the order a student meets them. */
export const LEVEL_OPTIONS: readonly number[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function labelForValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
