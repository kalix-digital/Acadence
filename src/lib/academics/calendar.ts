import type { CalendarEventRow, SemesterRow } from "@/types/database";

export type TeachingWeek = {
  /** 1-based position in the semester's teaching window. */
  index: number;
  startsOn: string;
  endsOn: string;
  /** Title of the holiday event covering this week, when there is one. */
  holiday: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parse(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

/** Monday of the week containing `date`, in UTC. */
function mondayOf(date: Date) {
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  return new Date(date.getTime() - offset * DAY);
}

/**
 * Teaching weeks are derived, never stored: a week counts when it overlaps the
 * semester's teaching window, and is marked as a holiday when an archived-out
 * calendar event of kind `holiday` covers any of it.
 */
export function teachingWeeks(
  semester: Pick<SemesterRow, "teaching_starts_on" | "teaching_ends_on">,
  events: Pick<CalendarEventRow, "title" | "kind" | "starts_on" | "ends_on" | "semester_id" | "archived_at">[],
): TeachingWeek[] {
  const teachingStart = parse(semester.teaching_starts_on);
  const teachingEnd = parse(semester.teaching_ends_on);
  if (Number.isNaN(teachingStart.getTime()) || Number.isNaN(teachingEnd.getTime())) return [];

  const holidays = events
    .filter((event) => event.kind === "holiday" && !event.archived_at)
    .map((event) => ({
      title: event.title,
      starts: parse(event.starts_on).getTime(),
      ends: parse(event.ends_on).getTime(),
    }));

  const weeks: TeachingWeek[] = [];
  let cursor = mondayOf(teachingStart);
  let index = 0;

  while (cursor.getTime() <= teachingEnd.getTime()) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor.getTime() + 6 * DAY);
    const overlaps =
      weekEnd.getTime() >= teachingStart.getTime() && weekStart.getTime() <= teachingEnd.getTime();

    if (overlaps) {
      index += 1;
      const holiday = holidays.find(
        (event) => event.ends >= weekStart.getTime() && event.starts <= weekEnd.getTime(),
      );
      weeks.push({
        index,
        startsOn: iso(weekStart < teachingStart ? teachingStart : weekStart),
        endsOn: iso(weekEnd > teachingEnd ? teachingEnd : weekEnd),
        holiday: holiday?.title ?? null,
      });
    }

    cursor = new Date(cursor.getTime() + 7 * DAY);
  }

  return weeks;
}

export function countTeachingWeeks(weeks: TeachingWeek[]) {
  return weeks.filter((week) => week.holiday === null).length;
}
