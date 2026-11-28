import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TimetableGrid } from "@/components/timetables/grid";
import { TimetablesBackLink, TimetablesNav } from "@/components/timetables/shell";
import { TimetableStatusBadge, TimetableTable } from "@/components/timetables/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTimetableAccess } from "@/lib/timetables/access";
import { formatSlot, weekdayLabel } from "@/lib/timetables/constants";
import {
  getVersion,
  timetableLookups,
  versionEntries,
} from "@/lib/timetables/data";

export const metadata: Metadata = { title: "Timetable version" };

export default async function TimetableVersionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  const { id } = await params;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const version = await getVersion(institutionId, id);
  if (!version) notFound();

  const [entries, lookups] = await Promise.all([
    versionEntries(institutionId, version.id),
    timetableLookups(institutionId),
  ]);

  const semester = lookups.semesters.find((row) => row.id === version.semester_id);
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
        <TimetablesBackLink />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Version {version.version_no}
          </h1>
          <TimetableStatusBadge status={version.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {semester ? `${semester.sessionName} · ${semester.name}` : "Semester"} · published{" "}
          {new Date(version.published_at).toLocaleString()} · immutable snapshot
        </p>
      </div>

      <TimetablesNav current="versions" />

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>{version.change_summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TimetableGrid
            entries={entries.map((entry) => ({
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
            emptyText="This version has no entries."
          />

          <TimetableTable
            columns={["Entry", "Day and time", "Room", "Lecturer", "Group"]}
            empty="No entries in this version."
            rows={entries.map((entry) => ({
              id: entry.id,
              cells: [
                <span key="entry" className="font-medium">
                  {entry.offeringLabel}
                </span>,
                <span key="time" className="text-xs">
                  {weekdayLabel(entry.day_of_week)}
                  <span className="mt-0.5 block tabular-nums text-muted-foreground">
                    {formatSlot(entry.starts_at, entry.ends_at)}
                  </span>
                </span>,
                <span key="room" className="text-xs">
                  {entry.roomName}
                </span>,
                <span key="lecturer" className="text-xs">
                  {entry.lecturerName}
                </span>,
                <span key="group" className="text-xs text-muted-foreground">
                  {entry.groupName}
                </span>,
              ],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
