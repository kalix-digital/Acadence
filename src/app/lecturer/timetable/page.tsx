import type { Metadata } from "next";
import Link from "next/link";
import { ChangeRequestForm } from "@/components/timetables/forms";
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
  lecturerPublishedEntries,
  pendingRequestForEntry,
  timetableLookups,
} from "@/lib/timetables/data";

export const metadata: Metadata = { title: "My timetable" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const MESSAGES: Record<string, string> = {
  requested: "Change request submitted. An administrator will review it.",
};

export default async function LecturerTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; entry?: string; updated?: string; error?: string }>;
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
    ? await lecturerPublishedEntries(institutionId, context.user.id, semesterId)
    : { lecturerId: null, entries: [] };

  const selected = params.entry
    ? result.entries.find((entry) => entry.id === params.entry) ?? null
    : null;
  const pending = selected
    ? await pendingRequestForEntry(institutionId, selected.id)
    : null;

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
          Your published teaching for{" "}
          {semester ? `${semester.sessionName} · ${semester.name}` : "this semester"}. Only the
          live version is shown; superseded versions stay in the institution&apos;s history.
        </p>
      </div>

      {params.updated && MESSAGES[params.updated] && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          {MESSAGES[params.updated]}
        </p>
      )}
      {params.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {params.error}
        </p>
      )}

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
              {result.entries.length} entr{result.entries.length === 1 ? "y" : "ies"}
            </span>
          </form>

          {!result.lecturerId && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Your account is not linked to a lecturer record yet. An administrator links the
              record before a personal timetable can appear.
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Week</CardTitle>
              <CardDescription>Click an entry to request a change to it.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimetableGrid
                entries={result.entries.map((entry) => ({
                  id: entry.id,
                  label: entry.offeringLabel,
                  detail: [entry.roomName, entry.groupName]
                    .filter((value) => value && value !== "—")
                    .join(" · "),
                  dayOfWeek: entry.day_of_week,
                  startsAt: entry.starts_at,
                  endsAt: entry.ends_at,
                  seed: entry.offering_id,
                }))}
                settings={settings}
                emptyText="Nothing scheduled for you in this semester's live version."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entries</CardTitle>
              <CardDescription>
                A requested change becomes a new published version once approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries to show.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {result.entries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <span className="font-medium">{entry.offeringLabel}</span>
                      <span className="text-xs text-muted-foreground">
                        {weekdayLabel(entry.day_of_week)}{" "}
                        {formatSlot(entry.starts_at, entry.ends_at)} · {entry.roomName}
                      </span>
                      <Link
                        href={`/lecturer/timetable?semester=${semesterId}&entry=${entry.id}`}
                        className="ml-auto rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Request change
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <CardTitle>Request a change</CardTitle>
                <CardDescription>
                  {selected.offeringLabel} · {weekdayLabel(selected.day_of_week)}{" "}
                  {formatSlot(selected.starts_at, selected.ends_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChangeRequestForm
                  entryId={selected.id}
                  day={selected.day_of_week}
                  startsAt={selected.starts_at}
                  endsAt={selected.ends_at}
                  rooms={lookups.rooms
                    .filter((room) => !room.archivedAt)
                    .map((room) => ({
                      id: room.id,
                      label: `${room.code} · ${room.name}`,
                    }))}
                  locked={Boolean(pending)}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
