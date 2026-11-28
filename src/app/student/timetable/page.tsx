import type { Metadata } from "next";
import { TimetableGrid } from "@/components/timetables/grid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTimetableReader } from "@/lib/timetables/access";
import { formatSlot, weekdayLabel } from "@/lib/timetables/constants";
import {
  studentPublishedEntries,
  timetableLookups,
} from "@/lib/timetables/data";

export const metadata: Metadata = { title: "My timetable" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function StudentTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const context = await requireTimetableReader();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const lookups = await timetableLookups(institutionId);
  const semesterId = params.semester ?? lookups.semesters[0]?.id;
  const semester = lookups.semesters.find((row) => row.id === semesterId) ?? null;

  const result = semesterId
    ? await studentPublishedEntries(institutionId, context.user.id, semesterId)
    : { entries: [] };

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My timetable</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your published classes for{" "}
          {semester ? `${semester.sessionName} · ${semester.name}` : "this semester"}, taken from
          the cohort groups your student record belongs to.
        </p>
      </div>

      {lookups.semesters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No semester is open yet.
        </p>
      ) : (
        <>
          <form className="flex flex-wrap items-center gap-2">
            <select name="semester" defaultValue={semesterId} className={selectClass}>
              {lookups.semesters.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.sessionName} · {row.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Show
            </button>
            <span className="text-xs text-muted-foreground">
              {result.entries.length} class{result.entries.length === 1 ? "" : "es"}
            </span>
          </form>

          <Card>
            <CardHeader>
              <CardTitle>Week</CardTitle>
              <CardDescription>
                Only the live published version is visible here; drafts never are.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimetableGrid
                entries={result.entries.map((entry) => ({
                  id: entry.id,
                  label: entry.offeringLabel,
                  detail: [entry.roomName, entry.lecturerName]
                    .filter((value) => value && value !== "—")
                    .join(" · "),
                  dayOfWeek: entry.day_of_week,
                  startsAt: entry.starts_at,
                  endsAt: entry.ends_at,
                  seed: entry.offering_id,
                }))}
                settings={settings}
                emptyText="No classes are published for your groups in this semester."
              />
            </CardContent>
          </Card>

          {result.entries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Classes</CardTitle>
                <CardDescription>Print this list or note the rooms.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border/70">
                  {result.entries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <span className="font-medium">{entry.offeringLabel}</span>
                      <span className="text-xs text-muted-foreground">
                        {weekdayLabel(entry.day_of_week)}{" "}
                        {formatSlot(entry.starts_at, entry.ends_at)} · {entry.roomName} ·{" "}
                        {entry.lecturerName}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
