import type { Metadata } from "next";
import { FacilityForm } from "@/components/facilities/forms";
import { FacilitiesBackLink, FacilitiesNav } from "@/components/facilities/shell";
import {
  ArchiveButton,
  EditLink,
  FacilityFlash,
  FacilityPagination,
  FacilityTable,
  FacilityToolbar,
} from "@/components/facilities/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireFacilitiesAccess } from "@/lib/facilities/access";
import { FACILITY_ENTITIES, weekdayLabel } from "@/lib/facilities/constants";
import {
  facilityLookups,
  getAvailability,
  listAvailability,
} from "@/lib/facilities/data";

export const metadata: Metadata = { title: "Room availability" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    semester?: string;
    room?: string;
    edit?: string;
    updated?: string;
    error?: string;
  }>;
}) {
  const context = await requireFacilitiesAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const archived = params.archived === "1";
  const page = Number(params.page ?? 1) || 1;

  const [availability, lookups, editing] = await Promise.all([
    listAvailability(institutionId, {
      archived,
      page,
      semesterId: params.semester,
      roomId: params.room,
    }),
    facilityLookups(institutionId),
    params.edit ? getAvailability(institutionId, params.edit) : Promise.resolve(null),
  ]);

  const basePath = FACILITY_ENTITIES.availability.path;

  return (
    <div className="space-y-5">
      <div>
        <FacilitiesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Room availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A booking must fit inside one of these windows. A room with no window in a
          semester cannot be booked, which is also what makes the utilisation report
          meaningful.
        </p>
      </div>

      <FacilitiesNav current="availability" />
      <FacilityFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit availability window" : "Add availability window"}</CardTitle>
          <CardDescription>
            Windows of one room may not overlap on the same day. Several windows per day
            are fine, as long as they are back to back or apart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FacilityForm entity="availability" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{FACILITY_ENTITIES.availability.label}</CardTitle>
          <CardDescription>Filter by semester or room, then edit or archive a window.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FacilityToolbar
            basePath={basePath}
            archived={archived}
            total={availability.total}
          />

          <form className="flex flex-wrap items-center gap-2">
            {archived && <input type="hidden" name="archived" value="1" />}
            <select name="semester" defaultValue={params.semester ?? ""} className={selectClass}>
              <option value="">All semesters</option>
              {lookups.semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name} · {semester.sessionName}
                </option>
              ))}
            </select>
            <select name="room" defaultValue={params.room ?? ""} className={selectClass}>
              <option value="">All rooms</option>
              {lookups.rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code} · {room.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Apply filters
            </button>
          </form>

          <FacilityTable
            columns={["Room", "Semester", "Day", "Window"]}
            empty={archived ? "No archived windows." : "No availability windows yet."}
            rows={availability.rows.map((window) => ({
              id: window.id,
              archived: Boolean(window.archived_at),
              cells: [
                <span key="room">
                  <span className="font-mono text-xs text-muted-foreground">{window.roomCode}</span>
                  <span className="mt-0.5 block font-medium">{window.roomName}</span>
                </span>,
                <span key="semester" className="text-xs">
                  {window.semesterName}
                  <span className="mt-0.5 block text-muted-foreground">{window.sessionName}</span>
                </span>,
                <span key="day" className="text-xs">
                  {weekdayLabel(window.day_of_week)}
                </span>,
                <span key="window" className="text-xs tabular-nums">
                  {window.opens_at.slice(0, 5)}–{window.closes_at.slice(0, 5)}
                </span>,
              ],
              actions: (
                <>
                  <EditLink basePath={basePath} id={window.id} />
                  <ArchiveButton
                    entity="availability"
                    id={window.id}
                    archived={Boolean(window.archived_at)}
                  />
                </>
              ),
            }))}
          />

          <FacilityPagination
            basePath={basePath}
            page={availability.page}
            pageCount={availability.pageCount}
            archived={archived}
            extraParams={{ semester: params.semester, room: params.room }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
