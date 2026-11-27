import {
  CURRICULUM_REQUIREMENTS,
  LEVEL_OPTIONS,
  PERIOD_STATUSES,
  PROGRAMME_LEVELS,
  ROOM_TYPES,
} from "@/lib/academics/constants";
import type {
  AcademicPeriodStatus,
  CurriculumRequirement,
  ProgrammeLevel,
  RoomType,
} from "@/types/database";

export type FieldErrors = Record<string, string>;
export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalUuid(value: string, errors: FieldErrors, field: string) {
  if (!value) return null;
  if (!UUID_PATTERN.test(value)) {
    errors[field] = "Choose a valid option.";
    return null;
  }
  return value;
}

function requiredUuid(value: string, errors: FieldErrors, field: string, message: string) {
  if (!UUID_PATTERN.test(value)) {
    errors[field] = message;
    return null;
  }
  return value;
}

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function code(formData: FormData, name: string, errors: FieldErrors) {
  const value = text(formData, name).toUpperCase();
  if (!CODE_PATTERN.test(value)) {
    errors[name] =
      "Use 1–20 letters, numbers, spaces, dots, slashes or hyphens, starting with a letter or number.";
  }
  return value;
}

function name(formData: FormData, field: string, errors: FieldErrors, min: number, max: number) {
  const value = text(formData, field);
  if (value.length < min || value.length > max) {
    errors[field] = `Enter a name between ${min} and ${max} characters.`;
  }
  return value;
}

function periodStatus(value: string, errors: FieldErrors) {
  const status = value || "planned";
  if (!(PERIOD_STATUSES as readonly string[]).includes(status)) {
    errors.status = "Choose a valid status.";
    return "planned" as AcademicPeriodStatus;
  }
  return status as AcademicPeriodStatus;
}

function levelOption(value: string, errors: FieldErrors, field = "level") {
  const level = Number(value || "100");
  if (!LEVEL_OPTIONS.includes(level)) {
    errors[field] = "Choose a level between 100 and 900 in steps of 100.";
  }
  return level;
}

function result<T>(values: T, errors: FieldErrors): Validated<T> {
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, data: values };
}

// ---------------------------------------------------------------------------
// Campuses
// ---------------------------------------------------------------------------
export type CampusInput = {
  name: string;
  code: string;
  address: string | null;
};

export function parseCampus(formData: FormData): Validated<CampusInput> {
  const errors: FieldErrors = {};
  const address = text(formData, "address");
  if (address.length > 300) errors.address = "Keep the address under 300 characters.";

  return result(
    {
      name: name(formData, "name", errors, 2, 120),
      code: code(formData, "code", errors),
      address: address || null,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Faculties
// ---------------------------------------------------------------------------
export type FacultyInput = {
  name: string;
  code: string;
  campusId: string | null;
};

export function parseFaculty(formData: FormData): Validated<FacultyInput> {
  const errors: FieldErrors = {};
  const campusId = optionalUuid(text(formData, "campusId"), errors, "campusId");

  return result(
    {
      name: name(formData, "name", errors, 2, 120),
      code: code(formData, "code", errors),
      campusId,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
export type DepartmentInput = { name: string; code: string; facultyId: string };

export function parseDepartment(formData: FormData): Validated<DepartmentInput> {
  const errors: FieldErrors = {};
  const facultyId =
    requiredUuid(text(formData, "facultyId"), errors, "facultyId", "Choose the faculty.") ?? "";

  return result(
    {
      name: name(formData, "name", errors, 2, 120),
      code: code(formData, "code", errors),
      facultyId,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Academic sessions
// ---------------------------------------------------------------------------
export type SessionInput = {
  name: string;
  startsOn: string;
  endsOn: string;
  status: AcademicPeriodStatus;
};

export function parseSession(formData: FormData): Validated<SessionInput> {
  const errors: FieldErrors = {};
  const name_ = name(formData, "name", errors, 4, 40);
  const startsOn = text(formData, "startsOn");
  const endsOn = text(formData, "endsOn");

  if (!validDate(startsOn)) errors.startsOn = "Choose a valid start date.";
  if (!validDate(endsOn)) errors.endsOn = "Choose a valid end date.";
  if (validDate(startsOn) && validDate(endsOn) && endsOn <= startsOn) {
    errors.endsOn = "The session must end after it starts.";
  }

  return result(
    { name: name_, startsOn, endsOn, status: periodStatus(text(formData, "status"), errors) },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Semesters
// ---------------------------------------------------------------------------
export type SemesterInput = {
  sessionId: string;
  name: string;
  sequence: number;
  teachingStartsOn: string;
  teachingEndsOn: string;
  examStartsOn: string;
  examEndsOn: string;
  status: AcademicPeriodStatus;
};

export function parseSemester(formData: FormData): Validated<SemesterInput> {
  const errors: FieldErrors = {};
  const sessionId =
    requiredUuid(text(formData, "sessionId"), errors, "sessionId", "Choose the session.") ?? "";
  const semesterName = name(formData, "name", errors, 2, 40);

  const sequence = Number(text(formData, "sequence") || "1");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 4) {
    errors.sequence = "Semester number must be between 1 and 4.";
  }

  const teachingStartsOn = text(formData, "teachingStartsOn");
  const teachingEndsOn = text(formData, "teachingEndsOn");
  const examStartsOn = text(formData, "examStartsOn");
  const examEndsOn = text(formData, "examEndsOn");

  for (const [field, value] of Object.entries({
    teachingStartsOn,
    teachingEndsOn,
    examStartsOn,
    examEndsOn,
  })) {
    if (!validDate(value)) errors[field] = "Choose a valid date.";
  }

  if (
    validDate(teachingStartsOn) &&
    validDate(teachingEndsOn) &&
    teachingEndsOn < teachingStartsOn
  ) {
    errors.teachingEndsOn = "Teaching must end on or after it starts.";
  }
  if (
    validDate(teachingEndsOn) &&
    validDate(examStartsOn) &&
    examStartsOn < teachingEndsOn
  ) {
    errors.examStartsOn = "Examinations start after teaching ends.";
  }
  if (validDate(examStartsOn) && validDate(examEndsOn) && examEndsOn < examStartsOn) {
    errors.examEndsOn = "Examinations must end on or after they start.";
  }

  return result(
    {
      sessionId,
      name: semesterName,
      sequence,
      teachingStartsOn,
      teachingEndsOn,
      examStartsOn,
      examEndsOn,
      status: periodStatus(text(formData, "status"), errors),
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------
export type ProgrammeInput = {
  code: string;
  name: string;
  departmentId: string;
  level: ProgrammeLevel;
  durationYears: number;
};

export function parseProgramme(formData: FormData): Validated<ProgrammeInput> {
  const errors: FieldErrors = {};
  const departmentId =
    requiredUuid(
      text(formData, "departmentId"),
      errors,
      "departmentId",
      "Choose the department.",
    ) ?? "";

  const programmeLevel = text(formData, "level") || "undergraduate";
  if (!(PROGRAMME_LEVELS as readonly string[]).includes(programmeLevel)) {
    errors.level = "Choose a valid programme level.";
  }

  const durationYears = Number(text(formData, "durationYears") || "4");
  if (!Number.isInteger(durationYears) || durationYears < 1 || durationYears > 8) {
    errors.durationYears = "Duration must be between 1 and 8 years.";
  }

  return result(
    {
      code: code(formData, "code", errors),
      name: name(formData, "name", errors, 2, 160),
      departmentId,
      level: programmeLevel as ProgrammeLevel,
      durationYears,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------
export type CourseInput = {
  code: string;
  title: string;
  departmentId: string;
  units: number;
  level: number;
  roomType: RoomType;
  requiredFeatures: string[];
};

export function parseCourse(formData: FormData): Validated<CourseInput> {
  const errors: FieldErrors = {};
  const departmentId =
    requiredUuid(
      text(formData, "departmentId"),
      errors,
      "departmentId",
      "Choose the department.",
    ) ?? "";

  const units = Number(text(formData, "units") || "3");
  if (!Number.isInteger(units) || units < 1 || units > 12) {
    errors.units = "Units must be between 1 and 12.";
  }

  const roomType = text(formData, "roomType") || "classroom";
  if (!(ROOM_TYPES as readonly string[]).includes(roomType)) {
    errors.roomType = "Choose a valid room type.";
  }

  const requiredFeatures = text(formData, "requiredFeatures")
    .split(",")
    .map((feature) => feature.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  if (requiredFeatures.some((feature) => feature.length > 40)) {
    errors.requiredFeatures = "Keep each required feature under 40 characters.";
  }

  return result(
    {
      code: code(formData, "code", errors),
      title: name(formData, "title", errors, 2, 160),
      departmentId,
      units,
      level: levelOption(text(formData, "level"), errors),
      roomType: roomType as RoomType,
      requiredFeatures,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Curriculum links
// ---------------------------------------------------------------------------
export type CurriculumInput = {
  programmeId: string;
  courseId: string;
  level: number;
  requirement: CurriculumRequirement;
};

export function parseCurriculum(formData: FormData): Validated<CurriculumInput> {
  const errors: FieldErrors = {};
  const programmeId =
    requiredUuid(text(formData, "programmeId"), errors, "programmeId", "Choose the programme.") ??
    "";
  const courseId =
    requiredUuid(text(formData, "courseId"), errors, "courseId", "Choose the course.") ?? "";

  const requirement = text(formData, "requirement") || "required";
  if (!(CURRICULUM_REQUIREMENTS as readonly string[]).includes(requirement)) {
    errors.requirement = "Choose required or elective.";
  }

  return result(
    {
      programmeId,
      courseId,
      level: levelOption(text(formData, "level"), errors),
      requirement: requirement as CurriculumRequirement,
    },
    errors,
  );
}
