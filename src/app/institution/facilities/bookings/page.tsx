import type { Metadata } from "next";
import { FacilityForm } from "@/components/facilities/forms";
import { FacilitiesBackLink, FacilitiesNav } from "@/components/facilities/shell";
import {
  CancelBookingButton,
  FacilityFlash,
  FacilityPagination,
  FacilityTable,
  FacilityToolbar,
} from "@/components/facilities/ui";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireFacilitiesAccess } from "@/lib/facilities/access";
import { FACILITY_ENTITIES } from "@/lib/facilities/constants";
import { facilityLookups, listBookings } from "@/lib/facilities/data";

export const metadata: Metadata = { title: "Room bookings" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function when(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    semester?: string;
    room?: string;
    status?: string;
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
  const page = Number(params.page ?? 1) || 1;
  const today = new Date().toISOString().slice(0, 10);
  const lockedDepartmentId =
    context.role === "department_admin" ? context.membership.departmentId : null;

  const [bookings, lookups] = await Promise.all([
    listBookings(institutionId, {
      q: params.q,
      page,
      semesterId: params.semester,
      roomId: params.room,
      status: params.status,
    }),
    facilityLookups(institutionId),
  ]);

  const basePath = FACILITY_ENTITIES.booking.path;

  return (
    <div className="space-y-5">
      <div>
        <FacilitiesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Room bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bookings are confirmed immediately. The database refuses a slot that overlaps a
          confirmed booking, exceeds the room&apos;s capacity, falls outside the semester
          or sits outside the room&apos;s availability.
        </p>
      </div>

      <FacilitiesNav current="booking" />
      <FacilityFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>Book a room</CardTitle>
          <CardDescription>
            A weekly series is booked as separate dates, so each one can be cancelled on
            its own. Cancelling frees the slot immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FacilityForm
            entity="booking"
            lookups={lookups}
            today={today}
            lockedDepartmentId={lockedDepartmentId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{FACILITY_ENTITIES.booking.label}</CardTitle>
          <CardDescription>Filter by semester, room or status, then cancel a booking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FacilityToolbar
            basePath={basePath}
            q={params.q}
            archived={false}
            total={bookings.total}
            placeholder="Search booking purpose"
            showArchivedToggle={false}
          />

          <form className="flex flex-wrap items-center gap-2">
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
            <select name="status" defaultValue={params.status ?? ""} className={selectClass}>
              <option value="">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Apply filters
            </button>
          </form>

          <FacilityTable
            columns={["When", "Room", "Purpose", "Department", "Attendees", "Status"]}
            empty="No bookings yet."
            rows={bookings.rows.map((booking) => ({
              id: booking.id,
              cells: [
                <span key="when" className="text-xs tabular-nums">
                  {when(booking.starts_at)}
                  <span className="mt-0.5 block text-muted-foreground">
                    to {when(booking.ends_at).slice(11)}
                  </span>
                </span>,
                <span key="room">
                  <span className="font-mono text-xs text-muted-foreground">{booking.roomCode}</span>
                  <span className="mt-0.5 block">{booking.roomName}</span>
                </span>,
                <span key="purpose" className="text-xs">
                  {booking.title}
                  {booking.purpose && (
                    <span className="mt-0.5 block text-muted-foreground">{booking.purpose}</span>
                  )}
                </span>,
                <span key="department" className="text-xs text-muted-foreground">
                  {booking.departmentName ?? "Institution-wide"}
                </span>,
                <span key="attendees" className="text-xs tabular-nums">
                  {booking.expected_attendees}
                </span>,
                <span key="status" className="text-xs">
                  <Badge variant={booking.status === "confirmed" ? "secondary" : "outline"}>
                    {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
                  </Badge>
                </span>,
              ],
              actions:
                booking.status === "confirmed" ? (
                  <CancelBookingButton id={booking.id} />
                ) : (
                  <span className="pr-2 text-xs text-muted-foreground">—</span>
                ),
            }))}
          />

          <FacilityPagination
            basePath={basePath}
            page={bookings.page}
            pageCount={bookings.pageCount}
            q={params.q}
            archived={false}
            extraParams={{
              semester: params.semester,
              room: params.room,
              status: params.status,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
