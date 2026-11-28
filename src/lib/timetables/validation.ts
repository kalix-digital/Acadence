import type { FieldErrors, Validated } from "@/lib/academics/validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function requiredUuid(value: string, errors: FieldErrors, field: string, message: string) {
  if (!UUID_PATTERN.test(value)) {
    errors[field] = message;
    return null;
  }
  return value;
}

function optionalUuid(value: string, errors: FieldErrors, field: string) {
  if (!value) return null;
  if (!UUID_PATTERN.test(value)) {
    errors[field] = "Choose a valid option.";
    return null;
  }
  return value;
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function result<T>(values: T, errors: FieldErrors): Validated<T> {
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data: values };
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------
export type TimetableDraftInput = {
  id: string | null;
  semesterId: string;
  departmentId: string | null;
  facultyId: string | null;
  title: string;
};

export function parseTimetableDraft(formData: FormData): Validated<TimetableDraftInput> {
  const errors: FieldErrors = {};
  const id = text(formData, "id") || null;
  const title = text(formData, "title");
  const scope = text(formData, "scope");
  const scopeId = text(formData, "scopeId");

  if (title.length < 2 || title.length > 120) {
    errors.title = "Enter a title between 2 and 120 characters.";
  }

  const semesterId =
    requiredUuid(text(formData, "semesterId"), errors, "semesterId", "Choose the semester.") ?? "";

  let departmentId: string | null = null;
  let facultyId: string | null = null;

  if (scope === "department") {
    departmentId = requiredUuid(scopeId, errors, "scopeId", "Choose the department.");
  } else if (scope === "faculty") {
    facultyId = requiredUuid(scopeId, errors, "scopeId", "Choose the faculty.");
  } else if (scope !== "institution") {
    errors.scope = "Choose where this draft applies.";
  }

  return result({ id, semesterId, departmentId, facultyId, title }, errors);
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------
export type TimetableEntryInput = {
  id: string | null;
  draftId: string;
  departmentId: string | null;
  offeringId: string | null;
  lecturerId: string | null;
  roomId: string | null;
  groupId: string | null;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  isFixed: boolean;
  notes: string | null;
};

export function parseTimetableEntry(formData: FormData): Validated<TimetableEntryInput> {
  const errors: FieldErrors = {};
  const id = text(formData, "id") || null;

  const draftId =
    requiredUuid(text(formData, "draftId"), errors, "draftId", "Choose the draft.") ?? "";

  const isFixed = text(formData, "isFixed") === "1";
  const offeringId = optionalUuid(text(formData, "offeringId"), errors, "offeringId");

  if (!isFixed && !offeringId && !errors.offeringId) {
    errors.offeringId = "Choose the course offering, or mark the entry as fixed.";
  }

  const dayOfWeek = Number(text(formData, "dayOfWeek"));
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    errors.dayOfWeek = "Choose a weekday.";
  }

  const startsAt = text(formData, "startsAt").slice(0, 5);
  const endsAt = text(formData, "endsAt").slice(0, 5);

  if (!TIME_PATTERN.test(startsAt)) errors.startsAt = "Choose a valid start time.";
  if (!TIME_PATTERN.test(endsAt)) errors.endsAt = "Choose a valid end time.";
  if (TIME_PATTERN.test(startsAt) && TIME_PATTERN.test(endsAt) && minutes(endsAt) <= minutes(startsAt)) {
    errors.endsAt = "The entry must end after it starts, on the same day.";
  }

  const notes = text(formData, "notes");
  if (notes.length > 300) errors.notes = "Keep notes under 300 characters.";

  return result(
    {
      id,
      draftId,
      departmentId: optionalUuid(text(formData, "departmentId"), errors, "departmentId"),
      offeringId,
      lecturerId: optionalUuid(text(formData, "lecturerId"), errors, "lecturerId"),
      roomId: optionalUuid(text(formData, "roomId"), errors, "roomId"),
      groupId: optionalUuid(text(formData, "groupId"), errors, "groupId"),
      dayOfWeek,
      startsAt,
      endsAt,
      isFixed,
      notes: notes || null,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Change requests
// ---------------------------------------------------------------------------
export type ChangeRequestInput = {
  entryId: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  roomId: string | null;
  reason: string;
};

export function parseChangeRequest(formData: FormData): Validated<ChangeRequestInput> {
  const errors: FieldErrors = {};
  const entryId =
    requiredUuid(text(formData, "entryId"), errors, "entryId", "Choose the entry.") ?? "";

  const dayOfWeek = Number(text(formData, "dayOfWeek"));
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    errors.dayOfWeek = "Choose a weekday.";
  }

  const startsAt = text(formData, "startsAt").slice(0, 5);
  const endsAt = text(formData, "endsAt").slice(0, 5);
  if (!TIME_PATTERN.test(startsAt)) errors.startsAt = "Choose a valid start time.";
  if (!TIME_PATTERN.test(endsAt)) errors.endsAt = "Choose a valid end time.";
  if (TIME_PATTERN.test(startsAt) && TIME_PATTERN.test(endsAt) && minutes(endsAt) <= minutes(startsAt)) {
    errors.endsAt = "The new slot must end after it starts.";
  }

  const reason = text(formData, "reason");
  if (reason.length < 4 || reason.length > 300) {
    errors.reason = "Give a reason between 4 and 300 characters.";
  }

  return result(
    {
      entryId,
      dayOfWeek,
      startsAt,
      endsAt,
      roomId: optionalUuid(text(formData, "roomId"), errors, "roomId"),
      reason,
    },
    errors,
  );
}
