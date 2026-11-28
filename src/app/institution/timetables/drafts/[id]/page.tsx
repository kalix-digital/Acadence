import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTimetableEntryAction } from "@/app/institution/timetables/actions";
import {
  DuplicateTimetableDraftForm,
  PublishTimetableForm,
  TimetableDraftForm,
  TimetableEntryForm,
} from "@/components/timetables/forms";
import { TimetableGrid } from "@/components/timetables/grid";
import { TimetableImportPanel } from "@/components/timetables/import-panel";
import { TimetablesBackLink, TimetablesNav, TimetableFlash } from "@/components/timetables/shell";
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
  draftEntries,
  getDraft,
  listVersions,
  offeringsForSemester,
  timetableLookups,
} from "@/lib/timetables/data";

export const metadata: Metadata = { title: "Timetable draft" };

export default async function TimetableDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    entry?: string;
    updated?: string;
    error?: string;
    copied?: string;
    skipped?: string;
  }>;
}) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;
  const { id } = await params;
  const query = await searchParams;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const draft = await getDraft(institutionId, id);
  if (!draft) notFound();

  const [entries, lookups, offerings, versions] = await Promise.all([
    draftEntries(institutionId, draft.id),
    timetableLookups(institutionId),
    offeringsForSemester(institutionId, draft.semester_id),
    listVersions(institutionId, { semesterId: draft.semester_id }),
  ]);

  const editing = query.entry ? entries.find((entry) => entry.id === query.entry) ?? null : null;
  const live = versions.find((version) => version.status === "published");
  const archived = Boolean(draft.archived_at) || draft.status === "archived";
  const semester = lookups.semesters.find((row) => row.id === draft.semester_id);

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

  const offeringLabels = offerings.map((offering) => ({
    value: offering.id,
    label: `${offering.courseCode} · ${offering.courseTitle}`,
  }));
  const lecturerLabels = lookups.lecturers.map((lecturer) => ({
    value: lecturer.id,
    label: `${lecturer.name} (${lecturer.staffNumber})`,
  }));
  const roomLabels = lookups.rooms
    .filter((room) => !room.archivedAt)
    .map((room) => ({
      value: room.id,
      label: `${room.code} · ${room.name} (${room.capacity})`,
    }));
  const groupLabels = lookups.groups.map((group) => ({
    value: group.id,
    label: `${group.code} · ${group.name}`,
  }));
  const departmentLabels = lookups.departments.map((department) => ({
    value: department.id,
    label: `${department.code} · ${department.name}`,
  }));

  const semesterOptions = lookups.semesters.map((row) => ({
    value: row.id,
    label: `${row.sessionName} · ${row.name}`,
  }));

  return (
    <div className="space-y-5">
      <div>
        <TimetablesBackLink />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{draft.title}</h1>
          <TimetableStatusBadge status={draft.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {semester ? `${semester.sessionName} · ${semester.name}` : "Semester"} ·{" "}
          {draft.department_id
            ? lookups.departments.find((row) => row.id === draft.department_id)?.name ?? "Department"
            : draft.faculty_id
              ? lookups.faculties.find((row) => row.id === draft.faculty_id)?.name ?? "Faculty"
              : "Whole institution"}
          {live ? ` · live version v${live.version_no}` : " · nothing published yet"}
        </p>
      </div>

      <TimetablesNav current="overview" />
      <TimetableFlash
        updated={query.updated}
        error={query.error}
        extra={
          query.updated === "copied"
            ? `${query.copied ?? 0} entries copied, ${query.skipped ?? 0} skipped because a reference could not be matched.`
            : undefined
        }
      />

      {archived && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          This draft is archived. Restore it from the drafts list before editing or publishing.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Week grid</CardTitle>
          <CardDescription>
            Drag an entry to move it — it keeps its duration — or click it to edit the full
            details. Times outside a slot still show at their real position.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            editable={!archived}
            selectedId={editing?.id ?? null}
            emptyText="No entries yet. Add the first one below, or import a CSV."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit entry" : "Add entry"}</CardTitle>
          <CardDescription>
            Offerings are limited to this draft&apos;s semester. The room, lecturer or group
            cannot be double-booked inside one draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableEntryForm
            draftId={draft.id}
            entry={editing}
            lookups={{
              offerings: offeringLabels,
              lecturers: lecturerLabels,
              rooms: roomLabels,
              groups: groupLabels,
              departments: departmentLabels,
            }}
            defaultDay={1}
            defaultStart="09:00"
          />
          {editing && (
            <div className="mt-3 flex items-center gap-3 text-xs">
              <Link href={`/institution/timetables/drafts/${draft.id}`} className="text-muted-foreground hover:text-foreground">
                Cancel editing
              </Link>
              <form action={deleteTimetableEntryAction}>
                <input type="hidden" name="id" value={editing.id} />
                <input type="hidden" name="draftId" value={draft.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Remove entry
                </button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Publish</CardTitle>
            <CardDescription>
              {live
                ? `Replaces live version v${live.version_no}; the old version stays in history.`
                : "Creates version 1 for this semester."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archived ? (
              <p className="text-xs text-muted-foreground">Restore the draft to publish it.</p>
            ) : (
              <PublishTimetableForm draftId={draft.id} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duplicate into another semester</CardTitle>
            <CardDescription>
              Re-matches offerings, lecturers, rooms and groups by code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DuplicateTimetableDraftForm draftId={draft.id} semesters={semesterOptions} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Draft details</CardTitle>
          <CardDescription>
            Changing the scope changes which part of the live version this draft replaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableDraftForm
            draft={draft as unknown as Record<string, unknown>}
            lookups={{
              semesters: semesterOptions,
              departments: departmentLabels,
              faculties: lookups.faculties.map((faculty) => ({
                value: faculty.id,
                label: `${faculty.code} · ${faculty.name}`,
              })),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>
            {entries.length} entr{entries.length === 1 ? "y" : "ies"} in this draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableTable
            columns={["Entry", "Day and time", "Room", "Lecturer", "Group"]}
            empty="No entries yet."
            rows={entries.map((entry) => ({
              id: entry.id,
              cells: [
                <span key="entry">
                  <span className="font-medium">{entry.offeringLabel}</span>
                  {entry.is_fixed && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">Fixed entry</span>
                  )}
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
              actions: (
                <Link
                  href={`/institution/timetables/drafts/${draft.id}?entry=${entry.id}`}
                  className="rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit
                </Link>
              ),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import entries</CardTitle>
          <CardDescription>
            A dry run reports every problem; the import writes all rows or none.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archived ? (
            <p className="text-xs text-muted-foreground">Restore the draft to import entries.</p>
          ) : (
            <TimetableImportPanel draftId={draft.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
