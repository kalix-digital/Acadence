import { FEATURE_CATEGORIES, ROOM_TYPE_OPTIONS } from "@/lib/facilities/constants";
import type { RoomFeatureCategory, RoomType } from "@/types/database";

export type FieldErrors = Record<string, string>;
export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,19}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function requiredUuid(value: string, errors: FieldErrors, field: string, message: string) {
  if (!UUID_PATTERN.test(value)) {
    errors[field] = message;
    return "";
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

function code(formData: FormData, errors: FieldErrors) {
  const value = text(formData, "code").toUpperCase();
  if (!CODE_PATTERN.test(value)) {
    errors.code =
      "Use 1–20 letters, numbers, spaces, dots, slashes or hyphens, starting with a letter or number.";
  }
  return value;
}

function name(formData: FormData, errors: FieldErrors, field: string, min: number, max: number) {
  const value = text(formData, field);
  if (value.length < min || value.length > max) {
    errors[field] = `Enter between ${min} and ${max} characters.`;
  }
  return value;
}

function optionalNote(formData: FormData, errors: FieldErrors, field: string, max: number) {
  const value = text(formData, field);
  if (value.length > max) errors[field] = `Keep this under ${max} characters.`;
  return value || null;
}

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

function integer(
  formData: FormData,
  errors: FieldErrors,
  field: string,
  min: number,
  max: number,
  label: string,
) {
  const raw = text(formData, field);
  const value = Number(raw);
  if (!raw || !Number.isInteger(value) || value < min || value > max) {
    errors[field] = `Enter ${label} between ${min} and ${max}.`;
  }
  return value;
}

function roomType(value: string, errors: FieldErrors) {
  const chosen = value || "classroom";
  if (!(ROOM_TYPE_OPTIONS as readonly string[]).includes(chosen)) {
    errors.roomType = "Choose a valid room type.";
    return "classroom" as RoomType;
  }
  return chosen as RoomType;
}

function featureCategory(value: string, errors: FieldErrors) {
  const chosen = value || "equipment";
  if (!(FEATURE_CATEGORIES as readonly string[]).includes(chosen)) {
    errors.category = "Choose a valid category.";
    return "equipment" as RoomFeatureCategory;
  }
  return chosen as RoomFeatureCategory;
}

function result<T>(values: T, errors: FieldErrors): Validated<T> {
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, data: values };
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
export type BuildingInput = {
  name: string;
  code: string;
  campusId: string | null;
  address: string | null;
  notes: string | null;
};

export function parseBuilding(formData: FormData): Validated<BuildingInput> {
  const errors: FieldErrors = {};

  return result(
    {
      name: name(formData, errors, "name", 2, 120),
      code: code(formData, errors),
      campusId: optionalUuid(text(formData, "campusId"), errors, "campusId"),
      address: optionalNote(formData, errors, "address", 300),
      notes: optionalNote(formData, errors, "notes", 500),
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export type RoomInput = {
  buildingId: string;
  name: string;
  code: string;
  roomType: RoomType;
  capacity: number;
  floor: string | null;
  accessibilityNotes: string | null;
};

export function parseRoom(formData: FormData): Validated<RoomInput> {
  const errors: FieldErrors = {};

  return result(
    {
      buildingId: requiredUuid(
        text(formData, "buildingId"),
        errors,
        "buildingId",
        "Choose the building.",
      ),
      name: name(formData, errors, "name", 1, 120),
      code: code(formData, errors),
      roomType: roomType(text(formData, "roomType"), errors),
      capacity: integer(formData, errors, "capacity", 1, 5000, "a seat count"),
      floor: optionalNote(formData, errors, "floor", 40),
      accessibilityNotes: optionalNote(formData, errors, "accessibilityNotes", 500),
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Feature catalogue and room equipment
// ---------------------------------------------------------------------------
export type FeatureInput = {
  name: string;
  category: RoomFeatureCategory;
};

export function parseFeature(formData: FormData): Validated<FeatureInput> {
  const errors: FieldErrors = {};

  return result(
    {
      name: name(formData, errors, "name", 2, 60),
      category: featureCategory(text(formData, "category"), errors),
    },
    errors,
  );
}

export type RoomFeatureInput = {
  roomId: string;
  featureId: string;
  quantity: number | null;
};

export function parseRoomFeature(formData: FormData): Validated<RoomFeatureInput> {
  const errors: FieldErrors = {};
  const rawQuantity = text(formData, "quantity");
  const quantity = rawQuantity
    ? integer(formData, errors, "quantity", 1, 500, "a quantity")
    : null;

  return result(
    {
      roomId: requiredUuid(text(formData, "roomId"), errors, "roomId", "Choose the room."),
      featureId: requiredUuid(
        text(formData, "featureId"),
        errors,
        "featureId",
        "Choose the feature.",
      ),
      quantity,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Availability windows
// ---------------------------------------------------------------------------
export type AvailabilityInput = {
  roomId: string;
  semesterId: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
};

export function parseAvailability(formData: FormData): Validated<AvailabilityInput> {
  const errors: FieldErrors = {};
  const dayOfWeek = Number(text(formData, "dayOfWeek") || "1");
  const opensAt = text(formData, "opensAt");
  const closesAt = text(formData, "closesAt");

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    errors.dayOfWeek = "Choose a day of the week.";
  }
  if (!TIME_PATTERN.test(opensAt)) errors.opensAt = "Choose a valid opening time.";
  if (!TIME_PATTERN.test(closesAt)) errors.closesAt = "Choose a valid closing time.";
  if (TIME_PATTERN.test(opensAt) && TIME_PATTERN.test(closesAt) && closesAt <= opensAt) {
    errors.closesAt = "The window must close after it opens.";
  }

  return result(
    {
      roomId: requiredUuid(text(formData, "roomId"), errors, "roomId", "Choose the room."),
      semesterId: requiredUuid(
        text(formData, "semesterId"),
        errors,
        "semesterId",
        "Choose the semester.",
      ),
      dayOfWeek,
      opensAt,
      closesAt,
    },
    errors,
  );
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export type BookingInput = {
  roomId: string;
  semesterId: string;
  departmentId: string | null;
  title: string;
  purpose: string | null;
  startsAt: string;
  endsAt: string;
  expectedAttendees: number;
};

export function parseBooking(formData: FormData): Validated<BookingInput> {
  const errors: FieldErrors = {};
  const date = text(formData, "date");
  const startTime = text(formData, "startTime");
  const endTime = text(formData, "endTime");

  if (!validDate(date)) errors.date = "Choose a valid date.";
  if (!TIME_PATTERN.test(startTime)) errors.startTime = "Choose a valid start time.";
  if (!TIME_PATTERN.test(endTime)) errors.endTime = "Choose a valid end time.";
  if (
    TIME_PATTERN.test(startTime) &&
    TIME_PATTERN.test(endTime) &&
    endTime <= startTime
  ) {
    errors.endTime = "The booking must end after it starts, on the same day.";
  }

  const startsAt = validDate(date) && TIME_PATTERN.test(startTime) ? `${date} ${startTime}:00` : "";
  const endsAt = validDate(date) && TIME_PATTERN.test(endTime) ? `${date} ${endTime}:00` : "";

  return result(
    {
      roomId: requiredUuid(text(formData, "roomId"), errors, "roomId", "Choose the room."),
      semesterId: requiredUuid(
        text(formData, "semesterId"),
        errors,
        "semesterId",
        "Choose the semester.",
      ),
      departmentId: optionalUuid(text(formData, "departmentId"), errors, "departmentId"),
      title: name(formData, errors, "title", 2, 120),
      purpose: optionalNote(formData, errors, "purpose", 300),
      startsAt,
      endsAt,
      expectedAttendees: integer(
        formData,
        errors,
        "expectedAttendees",
        1,
        5000,
        "an attendee count",
      ),
    },
    errors,
  );
}
