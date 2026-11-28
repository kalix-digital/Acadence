import type { Metadata } from "next";
import { teachingWeeks } from "@/lib/academics/calendar";
import { TimetableGrid } from "@/components/timetables/grid";
import { TimetablesBackLink, TimetablesNav } from "@/components/timetables/shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTimetableAccess } from "@/lib/timetables/access";
import {
  TIMETABLE_VIEWS,
  isTimetableView,
  weekdayLabel,
} from "@/lib/timetables/constants";
import {
  entriesForScope,
  timetableLookups,
  liveVersion,
} from "@/lib/timetables/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Timetable views" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function TimetableViewsPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; view?: string; id?: string; day?: string; week?: string }>;
}) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const lookups = await timetableLookups(institutionId);
  const semesterId = params.semester ?? lookups.semesters[0]?.id;
  const view = params.view && isTimetableView(params.view) ? params.view : "department";

  const options =
    view === "department"
      ? lookups.departments.map((row) => ({ id: row.id, label: `${row.code} · ${row.name}` }))
      : view === "faculty"
        ? lookups.faculties.map((row) => ({ id: row.id, label: `${row.code} · ${row.name}` }))
        : view === "lecturer"
          ? lookups.lecturers.map((row) => ({
              id: row.id,
              label: `${row.name} (${row.staffNumber})`,
            }))
          : view === "group"
            ? lookups.groups.map((row) => ({ id: row.id, label: `${row.code} · ${row.name}` }))
            : lookups.rooms
                .filter((row) => !row.archivedAt)
                .map((row) => ({ id: row.id, label: `${row.code} · ${row.name}` }));

  const selectedId = params.id ?? options[0]?.id;
  const day = Number(params.day ?? 0) || 0;

  const semester = semesterId
    ? lookups.semesters.find((row) => row.id === semesterId) ?? null
    : null;

  let weeks: ReturnType<typeof teachingWeeks> = [];
  if (semester) {
    const supabase = await createClient();
    const events = await supabase
      .from("calendar_events")
      .select("title, kind, starts_on, ends_on, semester_id, archived_at")
      .eq("institution_id", institutionId)
      .eq("session_id", semester.sessionId);
    if (!events.error) {
      weeks = teachingWeeks(
        { teaching_starts_on: semester.teachingStartsOn, teaching_ends_on: semester.teachingEndsOn },
        (events.data ?? []) as never,
      );
    }
  }

  const weekIndex = Number(params.week ?? 0) || 0;
  const selectedWeek = weeks.find((week) => week.index === weekIndex) ?? null;

  const result =
    semesterId && selectedId
      ? await entriesForScope(institutionId, { semesterId, view, id: selectedId })
      : { version: null, entries: [] };

  const filtered =
    day > 0 ? result.entries.filter((entry) => entry.day_of_week === day) : result.entries;

  const settings = lookups.settings
    ? {
        working_days: lookups.settings.working_days,
        slot_minutes: lookups.settings.slot_minutes,
        day_starts_at: lookups.settings.day_starts_at,
        day_ends_at: lookups.settings.day_ends_at,
      }
    : {
        working_days: [1, 2, 3, 4, 5],
        slot_minutes: 60,
        day_starts_at: "08:00:00",
        day_ends_at: "18:00:00",
      };

  const live = semesterId ? await liveVersion(institutionId, semesterId) : null;

  return (
    <div className="space-y-5">
      <div>
        <TimetablesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Timetable views</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every view reads the same live version. Week and day filters narrow the grid without
          changing the timetable.
        </p>
      </div>

      <TimetablesNav current="views" />

      {!semesterId || lookups.semesters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No semester yet.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {TIMETABLE_VIEWS.find((item) => item.key === view)?.label} view
            </CardTitle>
            <CardDescription>
              {live
                ? `Live version v${live.version_no} · published ${new Date(live.published_at).toLocaleString()}`
                : "Nothing is published for this semester yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-wrap items-end gap-2">
              <select name="semester" defaultValue={semesterId} className={selectClass}>
                {lookups.semesters.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.sessionName} · {row.name}
                  </option>
                ))}
              </select>

              <select name="view" defaultValue={view} className={selectClass}>
                {TIMETABLE_VIEWS.map((item) => (
                  <option key={item.key} value={item.key}>
                    By {item.label.toLowerCase()}
                  </option>
                ))}
              </select>

              <select name="id" defaultValue={selectedId ?? ""} className={selectClass}>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select name="day" defaultValue={String(day)} className={selectClass}>
                <option value="0">Every day</option>
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <option key={value} value={value}>
                    {weekdayLabel(value)}
                  </option>
                ))}
              </select>

              <select name="week" defaultValue={String(weekIndex)} className={selectClass}>
                <option value="0">Whole semester</option>
                {weeks.map((week) => (
                  <option key={week.index} value={week.index}>
                    Week {week.index} · {week.startsOn} to {week.endsOn}
                    {week.holiday ? ` (${week.holiday})` : ""}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Show
              </button>
            </form>

            {selectedWeek?.holiday && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Week {selectedWeek.index} is {selectedWeek.holiday}: no teaching is scheduled that
                week, though the weekly pattern remains on record.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
              {day > 0 ? ` on ${weekdayLabel(day)}` : ""}.
            </p>

            <TimetableGrid
              entries={filtered.map((entry) => ({
                id: entry.id,
                label: entry.offeringLabel,
                detail: [entry.roomName, entry.lecturerName]
                  .filter((value) => value && value !== "—")
                  .join(" · "),
                dayOfWeek: entry.day_of_week,
                startsAt: entry.starts_at,
                endsAt: entry.ends_at,
                seed: entry.lecturer_id,
              }))}
              settings={settings}
              emptyText={
                live
                  ? "No entries in this view."
                  : "Publish a draft to make this view available."
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
