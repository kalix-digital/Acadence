import type { ChangeRequestStatus, TimetableStatus } from "@/types/database";

export const TIMETABLE_STATUSES: readonly TimetableStatus[] = [
  "draft",
  "validated",
  "published",
  "superseded",
  "archived",
];

export const CHANGE_REQUEST_STATUSES: readonly ChangeRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
];

/** ISO-8601 weekday numbers, matching `timetable_entries.day_of_week`. */
export const WEEKDAYS: readonly { value: number; label: string; short: string }[] = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 7, label: "Sunday", short: "Sun" },
];

export function weekdayLabel(value: number) {
  return WEEKDAYS.find((day) => day.value === value)?.label ?? "Unknown day";
}

export function weekdayShort(value: number) {
  return WEEKDAYS.find((day) => day.value === value)?.short ?? "—";
}

/** The views required by FR-TT-008. */
export const TIMETABLE_VIEWS = [
  { key: "department", label: "Department" },
  { key: "faculty", label: "Faculty" },
  { key: "lecturer", label: "Lecturer" },
  { key: "group", label: "Student group" },
  { key: "room", label: "Room" },
] as const;

export type TimetableView = (typeof TIMETABLE_VIEWS)[number]["key"];

export function isTimetableView(value: string): value is TimetableView {
  return TIMETABLE_VIEWS.some((view) => view.key === value);
}

/** Tint per entry, stable for a given lecturer so a grid reads at a glance. */
const ENTRY_COLOURS = [
  "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100",
  "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  "border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-100",
];

export function entryColour(seed: string | null | undefined) {
  if (!seed) return ENTRY_COLOURS[0];
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % ENTRY_COLOURS.length;
  }
  return ENTRY_COLOURS[hash];
}

export function formatClock(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

export function formatSlot(startsAt: string, endsAt: string) {
  return `${formatClock(startsAt)}–${formatClock(endsAt)}`;
}

export function minutesOf(value: string) {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
}
