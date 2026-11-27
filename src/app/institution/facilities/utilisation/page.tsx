import type { Metadata } from "next";
import { FacilitiesBackLink, FacilitiesNav } from "@/components/facilities/shell";
import { FacilityTable } from "@/components/facilities/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireFacilitiesAccess } from "@/lib/facilities/access";
import { facilityLookups, utilisationData } from "@/lib/facilities/data";
import {
  buildUtilisation,
  formatHours,
  formatPercent,
} from "@/lib/facilities/utilisation";

export const metadata: Metadata = { title: "Room utilisation" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function UtilisationPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const context = await requireFacilitiesAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const lookups = await facilityLookups(institutionId);
  const semesterId = params.semester ?? lookups.semesters[0]?.id;

  if (!semesterId) {
    return (
      <div className="space-y-5">
        <div>
          <FacilitiesBackLink />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Room utilisation</h1>
        </div>
        <FacilitiesNav current="utilisation" />
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Create a semester in academic administration first: utilisation is measured over
          a semester&apos;s teaching weeks.
        </p>
      </div>
    );
  }

  const data = await utilisationData(institutionId, semesterId);
  const report = data.semester
    ? buildUtilisation({
        rooms: data.rooms,
        availability: data.availability,
        bookings: data.bookings,
        semester: data.semester,
        events: data.events,
      })
    : null;

  const rows = report
    ? [...report.rows].sort((a, b) => (b.utilisation ?? -1) - (a.utilisation ?? -1))
    : [];

  const semester = lookups.semesters.find((row) => row.id === semesterId);

  return (
    <div className="space-y-5">
      <div>
        <FacilitiesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Room utilisation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Booked hours over available hours. Both sides use the room&apos;s weekly
          windows on the semester&apos;s teaching weekdays, so holiday and exam weeks
          add no availability and no booked hours.
        </p>
      </div>

      <FacilitiesNav current="utilisation" />

      <form className="flex flex-wrap items-center gap-2">
        <select name="semester" defaultValue={semesterId} className={selectClass}>
          {lookups.semesters.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} · {option.sessionName}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Show
        </button>
        {semester && (
          <span className="text-xs text-muted-foreground">
            Teaching window {semester.teachingStartsOn} to {semester.teachingEndsOn}
          </span>
        )}
      </form>

      {!report ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          That semester no longer exists.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <p className="text-xs text-muted-foreground">Teaching weeks</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {report.teachingWeekCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <p className="text-xs text-muted-foreground">Available hours</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatHours(report.totals.availableHours)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <p className="text-xs text-muted-foreground">Overall utilisation</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatPercent(report.totals.utilisation)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatHours(report.totals.bookedHours)} booked
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{semester ? semester.name : "Semester"}</CardTitle>
              <CardDescription>
                A room with no availability window shows — rather than 0%, because there
                is nothing to divide by. Bookings that fall outside the teaching weeks or
                a window are listed as excluded instead of pushing use past 100%.
                Published timetable entries join the numerator in Phase 6.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FacilityTable
                columns={["Room", "Building", "Windows", "Available", "Booked", "Utilisation"]}
                empty="No rooms yet."
                rows={rows.map((row) => ({
                  id: row.id,
                  cells: [
                    <span key="room">
                      <span className="font-mono text-xs text-muted-foreground">{row.code}</span>
                      <span className="mt-0.5 block font-medium">{row.name}</span>
                    </span>,
                    <span key="building" className="text-xs">
                      {row.buildingName}
                      <span className="mt-0.5 block text-muted-foreground">{row.campusName}</span>
                    </span>,
                    <span key="windows" className="text-xs tabular-nums">
                      {row.windowCount}
                    </span>,
                    <span key="available" className="text-xs tabular-nums">
                      {formatHours(row.availableHours)}
                    </span>,
                    <span key="booked" className="text-xs tabular-nums">
                      {formatHours(row.bookedHours)}
                    </span>,
                    <span key="utilisation" className="text-xs tabular-nums">
                      {formatPercent(row.utilisation)}
                    </span>,
                  ],
                  actions: (
                    <span className="pr-2 text-xs text-muted-foreground">
                      {row.bookingCount} booking{row.bookingCount === 1 ? "" : "s"}
                      {row.excludedBookingCount > 0 && (
                        <>
                          {", "}
                          {row.excludedBookingCount} outside teaching weeks
                        </>
                      )}
                    </span>
                  ),
                }))}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
