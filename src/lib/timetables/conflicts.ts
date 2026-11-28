import { teachingWeeks } from "@/lib/academics/calendar";
import { minutesOf } from "@/lib/timetables/constants";
import type { CalendarEventRow, SemesterRow } from "@/types/database";

export type ConflictEntry = {
  id: string;
  label: string;
  offering_id: string | null;
  lecturer_id: string | null;
  room_id: string | null;
  group_id: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
};

export type TimetableIssue = {
  entryId: string | null;
  kind: "overlap" | "capacity" | "availability" | "calendar" | "hours" | "reference";
  message: string;
};

export type TimetableConflictContext = {
  entries: ConflictEntry[];
  rooms: { id: string; name: string; capacity: number; archived_at: string | null }[];
  offerings: { id: string; expected_size: number | null; archived_at: string | null }[];
  availability: {
    room_id: string;
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    archived_at: string | null;
  }[];
  settings: {
    working_days: number[];
    day_starts_at: string;
    day_ends_at: string;
    allow_teaching_in_exams: boolean;
  };
  semester: Pick<
    SemesterRow,
    "teaching_starts_on" | "teaching_ends_on" | "exam_starts_on" | "exam_ends_on"
  >;
  events: Pick<
    CalendarEventRow,
    "title" | "kind" | "starts_on" | "ends_on" | "semester_id" | "archived_at"
  >[];
};

const DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function overlaps(a: ConflictEntry, b: ConflictEntry) {
  return (
    a.day_of_week === b.day_of_week &&
    minutesOf(a.starts_at) < minutesOf(b.ends_at) &&
    minutesOf(b.starts_at) < minutesOf(a.ends_at)
  );
}

/**
 * Hard checks run before a draft is published (OQ-034). Phase 7 extends this
 * service with severity, explanations and soft warnings; everything found here
 * blocks publication today, so a bad timetable never becomes the live version.
 *
 * The database repeats the overlap rules as exclusion constraints on the new
 * version, which also catches a clash that spans two publishing scopes.
 */
export function validateTimetable({
  entries,
  rooms,
  offerings,
  availability,
  settings,
  semester,
  events,
}: TimetableConflictContext): TimetableIssue[] {
  const issues: TimetableIssue[] = [];
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const offeringMap = new Map(offerings.map((offering) => [offering.id, offering]));

  for (const entry of entries) {
    const label = entry.label || "Entry";
    const start = minutesOf(entry.starts_at);
    const end = minutesOf(entry.ends_at);

    if (end <= start) {
      issues.push({ entryId: entry.id, kind: "hours", message: `${label}: end time must be after the start time.` });
      continue;
    }

    if (!settings.working_days.includes(entry.day_of_week)) {
      issues.push({
        entryId: entry.id,
        kind: "hours",
        message: `${label}: the institution does not teach on that weekday.`,
      });
    }

    if (start < minutesOf(settings.day_starts_at) || end > minutesOf(settings.day_ends_at)) {
      issues.push({
        entryId: entry.id,
        kind: "hours",
        message: `${label}: ${entry.starts_at.slice(0, 5)}–${entry.ends_at.slice(0, 5)} is outside the institution's teaching day.`,
      });
    }

    if (entry.offering_id) {
      const offering = offeringMap.get(entry.offering_id);
      if (!offering) {
        issues.push({ entryId: entry.id, kind: "reference", message: `${label}: the course offering no longer exists.` });
      } else {
        if (offering.archived_at) {
          issues.push({ entryId: entry.id, kind: "reference", message: `${label}: the course offering is archived.` });
        }
        if (offering.expected_size && entry.room_id) {
          const room = roomMap.get(entry.room_id);
          if (room && room.capacity < offering.expected_size) {
            issues.push({
              entryId: entry.id,
              kind: "capacity",
              message: `${label}: ${offering.expected_size} expected but ${room.name} seats ${room.capacity}.`,
            });
          }
        }
      }
    }

    if (entry.room_id) {
      const room = roomMap.get(entry.room_id);
      if (!room) {
        issues.push({ entryId: entry.id, kind: "reference", message: `${label}: the room no longer exists.` });
      } else {
        if (room.archived_at) {
          issues.push({ entryId: entry.id, kind: "reference", message: `${label}: ${room.name} is archived.` });
        }

        const windows = availability.filter(
          (window) =>
            window.room_id === entry.room_id &&
            window.day_of_week === entry.day_of_week &&
            window.archived_at === null,
        );

        const fits = windows.some(
          (window) =>
            minutesOf(window.opens_at) <= start && minutesOf(window.closes_at) >= end,
        );

        if (!fits) {
          issues.push({
            entryId: entry.id,
            kind: "availability",
            message:
              windows.length === 0
                ? `${label}: ${room.name} has no availability window on that day this semester.`
                : `${label}: ${room.name} is not open for that whole slot.`,
          });
        }
      }
    }

    if (!settings.allow_teaching_in_exams) {
      const examStart = parseDate(semester.exam_starts_on).getTime();
      const examEnd = parseDate(semester.exam_ends_on).getTime();

      const collides = teachingWeeks(semester, events).some((week) => {
        const date = new Date(parseDate(week.startsOn).getTime() + (entry.day_of_week - 1) * DAY);
        const day = iso(date);
        if (day < week.startsOn || day > week.endsOn) return false;
        const time = parseDate(day).getTime();
        return time >= examStart && time <= examEnd;
      });

      if (collides) {
        issues.push({
          entryId: entry.id,
          kind: "calendar",
          message: `${label}: a weekly occurrence falls inside the examination period.`,
        });
      }
    }
  }

  const byRoom = new Map<string, ConflictEntry[]>();
  const byLecturer = new Map<string, ConflictEntry[]>();
  const byGroup = new Map<string, ConflictEntry[]>();

  for (const entry of entries) {
    if (entry.room_id) {
      const list = byRoom.get(entry.room_id) ?? [];
      list.push(entry);
      byRoom.set(entry.room_id, list);
    }
    if (entry.lecturer_id) {
      const list = byLecturer.get(entry.lecturer_id) ?? [];
      list.push(entry);
      byLecturer.set(entry.lecturer_id, list);
    }
    if (entry.group_id) {
      const list = byGroup.get(entry.group_id) ?? [];
      list.push(entry);
      byGroup.set(entry.group_id, list);
    }
  }

  const reported = new Set<string>();

  const reportOverlaps = (
    groups: Map<string, ConflictEntry[]>,
    describe: (entry: ConflictEntry) => string,
  ) => {
    for (const list of groups.values()) {
      for (let index = 0; index < list.length; index += 1) {
        for (let other = index + 1; other < list.length; other += 1) {
          if (!overlaps(list[index], list[other])) continue;
          const key = [list[index].id, list[other].id].sort().join(":");
          if (reported.has(key)) continue;
          reported.add(key);
          issues.push({
            entryId: list[other].id,
            kind: "overlap",
            message: `${list[other].label} overlaps ${list[index].label} (${describe(list[other])}).`,
          });
        }
      }
    }
  };

  reportOverlaps(byRoom, (entry) => `same room ${roomMap.get(entry.room_id ?? "")?.name ?? ""}`);
  reportOverlaps(byLecturer, () => "same lecturer");
  reportOverlaps(byGroup, () => "same student group");

  return issues;
}

/** Groups issues for display, keeping the first message per kind. */
export function summariseIssues(issues: TimetableIssue[]) {
  const unique: TimetableIssue[] = [];
  const seen = new Set<string>();
  for (const issue of issues) {
    const key = `${issue.kind}:${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(issue);
  }
  return unique;
}
