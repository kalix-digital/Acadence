import { teachingWeeks } from "@/lib/academics/calendar";
import type {
  CalendarEventRow,
  RoomAvailabilityRow,
  RoomBookingRow,
  SemesterRow,
} from "@/types/database";

export type UtilisationRoom = {
  id: string;
  name: string;
  code: string;
  capacity: number;
  buildingName: string;
  campusName: string;
};

export type UtilisationRow = UtilisationRoom & {
  /** Hours the room is open across the semester's teaching weeks. */
  availableHours: number;
  /**
   * Hours held by confirmed bookings that fall inside those teaching weeks and
   * the room's windows. Bookings in holidays, exam weeks or outside a window
   * are reported through `excludedBookingCount` instead of inflating this.
   */
  bookedHours: number;
  /** booked / available, or null when the room has no availability window. */
  utilisation: number | null;
  windowCount: number;
  /** Confirmed bookings counted in `bookedHours`. */
  bookingCount: number;
  /** Confirmed bookings in the semester that contribute nothing to it. */
  excludedBookingCount: number;
};

export type UtilisationReport = {
  rows: UtilisationRow[];
  totals: {
    availableHours: number;
    bookedHours: number;
    utilisation: number | null;
    excludedBookingCount: number;
  };
  /** Teaching weeks used as the denominator, after holidays are removed. */
  teachingWeekCount: number;
};

const DAY = 24 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;

/** A window on one weekday, as minutes from midnight. */
type Span = { start: number; end: number };

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function minutesOfTime(value: string) {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/** Booking timestamps are institution wall-clock `timestamp` values. */
function splitTimestamp(value: string) {
  const [date, time = "00:00:00"] = value.trim().replace("T", " ").split(" ");
  return { date, minutes: minutesOfTime(time.replace(/Z$/, "")) };
}

function mergeSpans(spans: Span[]) {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

function overlapMinutes(start: number, end: number, span: Span) {
  return Math.max(0, Math.min(end, span.end) - Math.max(start, span.start));
}

function isoWeekday(date: Date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * How many times each weekday actually occurs inside the semester's teaching
 * weeks, plus the individual dates. Weeks that a holiday event covers are
 * dropped, matching the teaching week derivation used elsewhere, and the first
 * and last week are clipped to the teaching window.
 */
export function weekdayCounts(
  semester: Pick<SemesterRow, "teaching_starts_on" | "teaching_ends_on">,
  events: Pick<CalendarEventRow, "title" | "kind" | "starts_on" | "ends_on" | "semester_id" | "archived_at">[],
) {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  const days = new Map<string, number>();
  const weeks = teachingWeeks(semester, events).filter((week) => week.holiday === null);

  for (const week of weeks) {
    const end = parseDate(week.endsOn).getTime();
    for (let cursor = parseDate(week.startsOn).getTime(); cursor <= end; cursor += DAY) {
      const date = new Date(cursor);
      const weekday = isoWeekday(date);
      counts[weekday] += 1;
      days.set(date.toISOString().slice(0, 10), weekday);
    }
  }

  return { counts, days, weeks: weeks.length };
}

/**
 * Utilisation is booked hours over available hours (FR-ROOM-006). Both sides
 * use the same set of instants: the room's weekly windows on the semester's
 * teaching days, with holiday weeks removed. A booking that falls in a holiday,
 * an exam week or a gap outside the room's window is therefore reported as
 * excluded rather than counted against a denominator that never contained it,
 * which is what kept some rooms above 100%. Published timetable entries join
 * the numerator in Phase 6.
 */
export function buildUtilisation({
  rooms,
  availability,
  bookings,
  semester,
  events,
}: {
  rooms: UtilisationRoom[];
  availability: Pick<RoomAvailabilityRow, "room_id" | "day_of_week" | "opens_at" | "closes_at" | "archived_at">[];
  bookings: Pick<RoomBookingRow, "room_id" | "starts_at" | "ends_at" | "status">[];
  semester: Pick<SemesterRow, "teaching_starts_on" | "teaching_ends_on">;
  events: Pick<CalendarEventRow, "title" | "kind" | "starts_on" | "ends_on" | "semester_id" | "archived_at">[];
}): UtilisationReport {
  const { counts, days, weeks } = weekdayCounts(semester, events);

  const rows: UtilisationRow[] = rooms.map((room) => {
    const windows = availability.filter(
      (window) => window.room_id === room.id && window.archived_at === null,
    );

    const spansByWeekday = new Map<number, Span[]>();
    for (const window of windows) {
      const spans = spansByWeekday.get(window.day_of_week) ?? [];
      spans.push({
        start: minutesOfTime(window.opens_at),
        end: minutesOfTime(window.closes_at),
      });
      spansByWeekday.set(window.day_of_week, spans);
    }
    for (const [weekday, spans] of spansByWeekday) {
      spansByWeekday.set(weekday, mergeSpans(spans));
    }

    let availableMinutes = 0;
    for (const [weekday, spans] of spansByWeekday) {
      const openMinutes = spans.reduce((total, span) => total + (span.end - span.start), 0);
      availableMinutes += openMinutes * (counts[weekday] ?? 0);
    }

    const roomBookings = bookings.filter(
      (booking) => booking.room_id === room.id && booking.status === "confirmed",
    );

    let bookedMinutes = 0;
    let bookingCount = 0;
    let excludedBookingCount = 0;

    for (const booking of roomBookings) {
      const start = splitTimestamp(booking.starts_at);
      const end = splitTimestamp(booking.ends_at);
      // The database refuses a booking that crosses midnight; clamp defensively.
      const endMinutes = end.date === start.date ? end.minutes : MINUTES_PER_DAY;
      const length = Math.max(0, endMinutes - start.minutes);

      const weekday = days.get(start.date);
      const daySpans = weekday ? spansByWeekday.get(weekday) ?? [] : [];
      const counted = daySpans.reduce(
        (total, span) => total + overlapMinutes(start.minutes, endMinutes, span),
        0,
      );

      bookedMinutes += counted;
      if (counted > 0 && counted === length) {
        bookingCount += 1;
      } else {
        excludedBookingCount += 1;
      }
    }

    const availableHours = availableMinutes / 60;
    const bookedHours = bookedMinutes / 60;

    return {
      ...room,
      availableHours: Math.round(availableHours * 100) / 100,
      bookedHours: Math.round(bookedHours * 100) / 100,
      utilisation:
        availableMinutes > 0 ? Math.min(1, bookedMinutes / availableMinutes) : null,
      windowCount: windows.length,
      bookingCount,
      excludedBookingCount,
    };
  });

  let availableMinutes = 0;
  let bookedMinutes = 0;
  let excludedBookingCount = 0;
  for (const row of rows) {
    availableMinutes += row.availableHours * 60;
    bookedMinutes += row.bookedHours * 60;
    excludedBookingCount += row.excludedBookingCount;
  }

  return {
    rows,
    totals: {
      availableHours: Math.round((availableMinutes / 60) * 100) / 100,
      bookedHours: Math.round((bookedMinutes / 60) * 100) / 100,
      utilisation:
        availableMinutes > 0 ? Math.min(1, bookedMinutes / availableMinutes) : null,
      excludedBookingCount,
    },
    teachingWeekCount: weeks,
  };
}

export function formatHours(value: number) {
  return `${Math.round(value * 10) / 10}h`;
}

export function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}
