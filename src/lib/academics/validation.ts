import {
  ASSIGNMENT_ROLES,
  CALENDAR_EVENT_KINDS,
  CURRICULUM_REQUIREMENTS,
  LECTURER_STATUSES,
  LEVEL_OPTIONS,
  OFFERING_STATUSES,
  PERIOD_STATUSES,
  PROGRAMME_LEVELS,
  ROOM_TYPES,
  STUDENT_STATUSES,
} from "@/lib/academics/constants";
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
export type StudentInput = {
  matricNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  programmeId: string;
  level: number;
  entrySessionId: string | null;
  status: StudentStatus;
};

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/._-]{1,29}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function identifier(formData: FormData, field: string, errors: FieldErrors, label: string) {
  const value = text(formData, field).toUpperCase();
  if (!IDENTIFIER_PATTERN.test(value)) {
    errors[field] = `Enter a valid ${label} (2–30 letters, numbers, dots, slashes or hyphens).`;
  }
  return value;
}

function optionalEmail(formData: FormData, field: string, errors: FieldErrors) {
  const value = text(formData, field).toLowerCase();
  if (value && !EMAIL_PATTERN.test(value)) {
    errors[field] = "Enter a valid email address.";
  }
  return value || null;
}

function optionalPhone(formData: FormData, field: string, errors: FieldErrors) {
  const value = text(formData, field);
  if (value.length > 32) errors[field] = "Keep the phone number under 32 characters.";
  return value || null;
}

function enumValue<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
  errors: FieldErrors,
  field: string,
) {
  if (!value) return fallback;
  if (!(allowed as readonly string[]).includes(value)) {
    errors[field] = "Choose a valid option.";
    return fallback;
  }
  return value as T;
}

function optionalSize(formData: FormData, field: string, errors: FieldErrors) {
  const raw = text(formData, field);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 2000) {
    errors[field] = "Enter a size between 1 and 2000, or leave it blank.";
    return null;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
export function parseStudent(formData: FormData): Validated<StudentInput> {
  const errors: FieldErrors = {};
  const programmeId =
    requiredUuid(text(formData, "programmeId"), errors, "programmeId", "Choose the programme.") ??
    "";

  return result(
    {
      matricNumber: identifier(formData, "matricNumber", errors, "matriculation number"),
      firstName: name(formData, "firstName", errors, 1, 80),
      lastName: name(formData, "lastName", errors, 1, 80),
      email: optionalEmail(formData, "email", errors),
      phone: optionalPhone(formData, "phone", errors),
      programmeId,
      level: levelOption(text(formData, "level"), errors),
      entrySessionId: optionalUuid(text(formData, "entrySessionId"), errors, "entrySessionId"),
      status: enumValue(
        text(formData, "status"),
        STUDENT_STATUSES,
        "active" as StudentStatus,
        errors,
        "status",
      ),
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Lecturers
// ---------------------------------------------------------------------------
export type LecturerInput = {
  staffNumber: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  departmentId: string;
  status: LecturerStatus;
};

export function parseLecturer(formData: FormData): Validated<LecturerInput> {
  const errors: FieldErrors = {};
  const departmentId =
    requiredUuid(
      text(formData, "departmentId"),
      errors,
      "departmentId",
      "Choose the department.",
    ) ?? "";
  const title = text(formData, "title");
  if (title.length > 40) errors.title = "Keep the title under 40 characters.";

  return result(
    {
      staffNumber: identifier(formData, "staffNumber", errors, "staff number"),
      title: title || null,
      firstName: name(formData, "firstName", errors, 1, 80),
      lastName: name(formData, "lastName", errors, 1, 80),
      email: optionalEmail(formData, "email", errors),
      phone: optionalPhone(formData, "phone", errors),
      departmentId,
      status: enumValue(
        text(formData, "status"),
        LECTURER_STATUSES,
        "active" as LecturerStatus,
        errors,
        "status",
      ),
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Student groups
// ---------------------------------------------------------------------------
export type StudentGroupInput = {
  programmeId: string;
  sessionId: string;
  level: number;
  name: string;
  code: string;
  expectedSize: number | null;
};

export function parseStudentGroup(formData: FormData): Validated<StudentGroupInput> {
  const errors: FieldErrors = {};
  const programmeId =
    requiredUuid(text(formData, "programmeId"), errors, "programmeId", "Choose the programme.") ??
    "";
  const sessionId =
    requiredUuid(text(formData, "sessionId"), errors, "sessionId", "Choose the session.") ?? "";

  return result(
    {
      programmeId,
      sessionId,
      level: levelOption(text(formData, "level"), errors),
      name: name(formData, "name", errors, 2, 80),
      code: code(formData, "code", errors),
      expectedSize: optionalSize(formData, "expectedSize", errors),
    },
    errors,
  );
}

export type GroupMemberInput = { groupId: string; studentId: string };

export function parseGroupMember(formData: FormData): Validated<GroupMemberInput> {
  const errors: FieldErrors = {};
  return result(
    {
      groupId: requiredUuid(text(formData, "groupId"), errors, "groupId", "Choose the group.") ?? "",
      studentId:
        requiredUuid(text(formData, "studentId"), errors, "studentId", "Choose the student.") ?? "",
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Course offerings
// ---------------------------------------------------------------------------
export type OfferingInput = {
  courseId: string;
  sessionId: string;
  semesterId: string;
  coordinatorLecturerId: string | null;
  expectedSize: number | null;
  status: OfferingStatus;
  notes: string | null;
};

export function parseOffering(formData: FormData): Validated<OfferingInput> {
  const errors: FieldErrors = {};
  const courseId =
    requiredUuid(text(formData, "courseId"), errors, "courseId", "Choose the course.") ?? "";
  const sessionId =
    requiredUuid(text(formData, "sessionId"), errors, "sessionId", "Choose the session.") ?? "";
  const semesterId =
    requiredUuid(text(formData, "semesterId"), errors, "semesterId", "Choose the semester.") ??
    "";
  const notes = text(formData, "notes");
  if (notes.length > 500) errors.notes = "Keep notes under 500 characters.";

  return result(
    {
      courseId,
      sessionId,
      semesterId,
      coordinatorLecturerId: optionalUuid(
        text(formData, "coordinatorLecturerId"),
        errors,
        "coordinatorLecturerId",
      ),
      expectedSize: optionalSize(formData, "expectedSize", errors),
      status: enumValue(
        text(formData, "status"),
        OFFERING_STATUSES,
        "planned" as OfferingStatus,
        errors,
        "status",
      ),
      notes: notes || null,
    },
    errors,
  );
}

export type OfferingLecturerInput = {
  offeringId: string;
  lecturerId: string;
  role: "lead" | "assistant";
  contactHours: number | null;
};

export function parseOfferingLecturer(formData: FormData): Validated<OfferingLecturerInput> {
  const errors: FieldErrors = {};
  const contactHoursRaw = text(formData, "contactHours");
  let contactHours: number | null = null;

  if (contactHoursRaw) {
    contactHours = Number(contactHoursRaw);
    if (!Number.isFinite(contactHours) || contactHours < 0 || contactHours > 200) {
      errors.contactHours = "Enter contact hours between 0 and 200.";
      contactHours = null;
    }
  }

  return result(
    {
      offeringId:
        requiredUuid(text(formData, "offeringId"), errors, "offeringId", "Choose the offering.") ??
        "",
      lecturerId:
        requiredUuid(text(formData, "lecturerId"), errors, "lecturerId", "Choose the lecturer.") ??
        "",
      role: enumValue(
        text(formData, "role"),
        ASSIGNMENT_ROLES,
        "lead" as const,
        errors,
        "role",
      ),
      contactHours,
    },
    errors,
  );
}

export type OfferingGroupInput = { offeringId: string; groupId: string };

export function parseOfferingGroup(formData: FormData): Validated<OfferingGroupInput> {
  const errors: FieldErrors = {};
  return result(
    {
      offeringId:
        requiredUuid(text(formData, "offeringId"), errors, "offeringId", "Choose the offering.") ??
        "",
      groupId: requiredUuid(text(formData, "groupId"), errors, "groupId", "Choose the group.") ?? "",
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Academic calendar
// ---------------------------------------------------------------------------
export type CalendarEventInput = {
  sessionId: string;
  semesterId: string | null;
  title: string;
  description: string | null;
  kind: CalendarEventKind;
  startsOn: string;
  endsOn: string;
};

export function parseCalendarEvent(formData: FormData): Validated<CalendarEventInput> {
  const errors: FieldErrors = {};
  const sessionId =
    requiredUuid(text(formData, "sessionId"), errors, "sessionId", "Choose the session.") ?? "";
  const startsOn = text(formData, "startsOn");
  const endsOn = text(formData, "endsOn");
  const description = text(formData, "description");

  if (!validDate(startsOn)) errors.startsOn = "Choose a valid start date.";
  if (!validDate(endsOn)) errors.endsOn = "Choose a valid end date.";
  if (validDate(startsOn) && validDate(endsOn) && endsOn < startsOn) {
    errors.endsOn = "The event cannot end before it starts.";
  }
  if (description.length > 500) errors.description = "Keep the description under 500 characters.";

  return result(
    {
      sessionId,
      semesterId: optionalUuid(text(formData, "semesterId"), errors, "semesterId"),
      title: name(formData, "title", errors, 2, 120),
      description: description || null,
      kind: enumValue(
        text(formData, "kind"),
        CALENDAR_EVENT_KINDS,
        "event" as CalendarEventKind,
        errors,
        "kind",
      ),
      startsOn,
      endsOn,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Curriculum links (continued)
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
