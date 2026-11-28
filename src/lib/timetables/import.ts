import { parseCsv } from "@/lib/academics/import";
import type { OfferingOption, TimetableLookups } from "@/lib/timetables/data";

/**
 * Timetable entry import (FR-TT-009, OQ-037).
 *
 * A row is matched by code, never by id: the offering by course code in the
 * chosen semester, the lecturer by staff number, the room and student group by
 * code. The first pass validates every row and reports each problem; nothing is
 * written until the second pass, and that pass inserts the whole batch in one
 * statement, so a bad row imports nothing.
 */

export const TIMETABLE_IMPORT_COLUMNS = [
  "course_code",
  "day",
  "start_time",
  "end_time",
  "lecturer_staff_number",
  "room_code",
  "group_code",
  "notes",
] as const;

const HEADERS: Record<string, string[]> = {
  course_code: ["course_code", "course", "offering", "course code"],
  day: ["day", "weekday", "day_of_week"],
  start_time: ["start_time", "start", "starts_at"],
  end_time: ["end_time", "end", "ends_at"],
  lecturer_staff_number: ["lecturer_staff_number", "staff_number", "lecturer", "staff_no"],
  room_code: ["room_code", "room"],
  group_code: ["group_code", "group", "student_group"],
  notes: ["notes", "note", "title"],
};

const DAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

export type TimetableImportRow = {
  line: number;
  label: string;
  errors: string[];
};

export type TimetableImportPreview = {
  total: number;
  valid: number;
  invalid: number;
  rows: TimetableImportRow[];
  fatal: string | null;
};

export type TimetableImportPayload = {
  offering_id: string | null;
  lecturer_id: string | null;
  room_id: string | null;
  group_id: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  is_fixed: boolean;
  notes: string | null;
};

export type TimetableImportState = {
  status: "idle" | "error" | "checked" | "imported";
  message?: string;
  draftId?: string;
  /** The validated text, so the commit pass does not need the file again. */
  csv?: string;
  preview?: TimetableImportPreview;
  imported?: number;
};

export const IDLE_TIMETABLE_IMPORT: TimetableImportState = { status: "idle" };

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function positionsFor(headers: string[]) {
  const seen = new Map<string, number>();
  headers.forEach((header, index) => seen.set(normaliseHeader(header), index));

  const positions: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADERS)) {
    const match = aliases
      .map((alias) => seen.get(normaliseHeader(alias)))
      .find((index) => index !== undefined);
    if (match !== undefined) positions[field] = match;
  }
  return positions;
}

function cell(cells: string[], positions: Record<string, number>, field: string) {
  const index = positions[field];
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

function dayNumber(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  const numeric = Number(text);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 7) return numeric;
  const index = DAY_NAMES.indexOf(text);
  if (index >= 0) return index + 1;
  const short = DAY_NAMES.findIndex((day) => day.slice(0, 3) === text);
  return short >= 0 ? short + 1 : null;
}

function clock(value: string) {
  if (!TIME_PATTERN.test(value)) return null;
  const [hour, minute] = value.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function buildTimetableImport({
  csv,
  semesterId,
  offerings,
  lookups,
}: {
  csv: string;
  semesterId: string;
  offerings: OfferingOption[];
  lookups: TimetableLookups;
}): { preview: TimetableImportPreview; payloads: TimetableImportPayload[] } {
  const table = parseCsv(csv);
  const preview: TimetableImportPreview = {
    total: 0,
    valid: 0,
    invalid: 0,
    rows: [],
    fatal: null,
  };

  if (table.length === 0) {
    preview.fatal = "The file is empty. Paste or upload a CSV with a header row.";
    return { preview, payloads: [] };
  }

  const positions = positionsFor(table[0]);
  const missing = ["course_code", "day", "start_time", "end_time"].filter(
    (field) => positions[field] === undefined,
  );
  if (missing.length > 0) {
    preview.fatal = `The header row is missing: ${missing.join(", ")}.`;
    return { preview, payloads: [] };
  }

  const offeringByCourse = new Map(
    offerings
      .filter((offering) => offering.semesterId === semesterId && !offering.archivedAt)
      .map((offering) => [offering.courseCode.toUpperCase(), offering]),
  );
  const lecturerByStaff = new Map(
    lookups.lecturers.map((lecturer) => [lecturer.staffNumber.toUpperCase(), lecturer]),
  );
  const roomByCode = new Map(
    lookups.rooms
      .filter((room) => !room.archivedAt)
      .map((room) => [room.code.toUpperCase(), room]),
  );
  const groupByCode = new Map(
    lookups.groups.map((group) => [group.code.toUpperCase(), group]),
  );

  const payloads: TimetableImportPayload[] = [];

  for (let index = 1; index < table.length; index += 1) {
    const cells = table[index];
    const line = index + 1;
    const errors: string[] = [];

    const courseCode = cell(cells, positions, "course_code").toUpperCase();
    const dayValue = cell(cells, positions, "day");
    const startValue = clock(cell(cells, positions, "start_time"));
    const endValue = clock(cell(cells, positions, "end_time"));
    const staffNumber = cell(cells, positions, "lecturer_staff_number").toUpperCase();
    const roomCode = cell(cells, positions, "room_code").toUpperCase();
    const groupCode = cell(cells, positions, "group_code").toUpperCase();
    const notes = cell(cells, positions, "notes");
    const label = `${courseCode || "row"} · ${dayValue} ${startValue ?? ""}`.trim();

    const offering = courseCode ? offeringByCourse.get(courseCode) : undefined;
    const day = dayNumber(dayValue);
    const lecturer = staffNumber ? lecturerByStaff.get(staffNumber) : undefined;
    const room = roomCode ? roomByCode.get(roomCode) : undefined;
    const group = groupCode ? groupByCode.get(groupCode) : undefined;

    if (!courseCode && !notes) {
      errors.push("Give a course code, or notes for a fixed entry that has no offering.");
    } else if (courseCode && !offering) {
      errors.push(`Unknown course code "${courseCode}" in this semester.`);
    }
    if (day === null) errors.push("Day must be 1–7 or a weekday name.");
    if (!startValue) errors.push("Start time must look like 09:00.");
    if (!endValue) errors.push("End time must look like 11:00.");
    if (startValue && endValue && endValue <= startValue) {
      errors.push("End time must be after the start time.");
    }
    if (staffNumber && !lecturer) errors.push(`Unknown staff number "${staffNumber}".`);
    if (roomCode && !room) errors.push(`Unknown room code "${roomCode}".`);
    if (groupCode && !group) errors.push(`Unknown student group "${groupCode}".`);
    if (notes.length > 300) errors.push("Notes must be under 300 characters.");

    preview.total += 1;

    if (errors.length > 0) {
      preview.invalid += 1;
      preview.rows.push({ line, label, errors });
      continue;
    }

    preview.valid += 1;
    payloads.push({
      offering_id: offering?.id ?? null,
      lecturer_id: lecturer?.id ?? null,
      room_id: room?.id ?? null,
      group_id: group?.id ?? null,
      day_of_week: day as number,
      starts_at: `${startValue}:00`,
      ends_at: `${endValue}:00`,
      is_fixed: !offering,
      notes: notes || null,
    });
  }

  return { preview, payloads };
}
