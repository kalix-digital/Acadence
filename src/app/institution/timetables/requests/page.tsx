import type { Metadata } from "next";
import Link from "next/link";
import { reviewChangeRequestAction } from "@/app/institution/timetables/actions";
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
import { listChangeRequests, timetableLookups } from "@/lib/timetables/data";

export const metadata: Metadata = { title: "Timetable change requests" };

function proposedLabel(proposed: Record<string, unknown>, rooms: Map<string, string>) {
  const day = Number(proposed.day_of_week ?? 0);
  const start = typeof proposed.starts_at === "string" ? proposed.starts_at.slice(0, 5) : "";
  const end = typeof proposed.ends_at === "string" ? proposed.ends_at.slice(0, 5) : "";
  const room =
    typeof proposed.room_id === "string" ? rooms.get(proposed.room_id) ?? "another room" : "";

  const parts = [
    day ? weekdayLabel(day) : "",
    start && end ? `${start}–${end}` : "",
    room,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "No specific change";
}

export default async function ChangeRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; updated?: string; error?: string }>;
}) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const [requests, lookups] = await Promise.all([
    listChangeRequests(institutionId, { status: params.status }),
    timetableLookups(institutionId),
  ]);

  const roomNames = new Map(lookups.rooms.map((room) => [room.id, `${room.code} · ${room.name}`]));
  const pending = requests.filter((request) => request.status === "pending");
  const decided = requests.filter((request) => request.status !== "pending");

  return (
    <div className="space-y-5">
      <div>
        <TimetablesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Change requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A lecturer asks for one published entry to move. Approval applies the change to a new
          version and publishes it; the old version stays in history.
        </p>
      </div>

      <TimetablesNav current="requests" />
      <TimetableFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>Waiting for review</CardTitle>
          <CardDescription>
            {pending.length} open request{pending.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing waiting. Requests raised by lecturers appear here.
            </p>
          ) : (
            pending.map((request) => (
              <div key={request.id} className="rounded-xl border border-border/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{request.entryLabel}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Now: {weekdayLabel(request.entryDay)}{" "}
                      {formatSlot(request.entryStartsAt, request.entryEndsAt)} ·{" "}
                      {request.roomName}
                    </p>
                    <p className="mt-1 text-xs">
                      Requested: {proposedLabel(request.proposed, roomNames)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.requesterName} · {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  <TimetableStatusBadge status={request.status} />
                </div>

                <p className="mt-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs">{request.reason}</p>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <form action={reviewChangeRequestAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={request.id} />
                    <input type="hidden" name="approve" value="1" />
                    <input
                      name="note"
                      maxLength={300}
                      placeholder="Review note (optional)"
                      className="h-8 w-56 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    />
                    <button
                      type="submit"
                      className="h-8 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Approve and publish
                    </button>
                  </form>

                  <form action={reviewChangeRequestAction}>
                    <input type="hidden" name="id" value={request.id} />
                    <input type="hidden" name="approve" value="0" />
                    <input
                      name="note"
                      maxLength={300}
                      placeholder="Why not? (optional)"
                      className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    />
                    <button
                      type="submit"
                      className="ml-2 h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decided</CardTitle>
          <CardDescription>Recent decisions, kept as history.</CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableTable
            columns={["Entry", "Requested change", "Requester", "Status", "Reviewed"]}
            empty="No decisions yet."
            rows={decided.map((request) => ({
              id: request.id,
              cells: [
                <span key="entry">
                  <span className="font-medium">{request.entryLabel}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {weekdayLabel(request.entryDay)}{" "}
                    {formatSlot(request.entryStartsAt, request.entryEndsAt)}
                  </span>
                </span>,
                <span key="proposed" className="text-xs">
                  {proposedLabel(request.proposed, roomNames)}
                </span>,
                <span key="requester" className="text-xs">
                  {request.requesterName}
                </span>,
                <TimetableStatusBadge key="status" status={request.status} />,
                <span key="reviewed" className="text-xs text-muted-foreground">
                  {request.reviewed_at
                    ? new Date(request.reviewed_at).toLocaleString()
                    : "—"}
                  {request.reviewerName && (
                    <span className="mt-0.5 block">by {request.reviewerName}</span>
                  )}
                  {request.review_note && (
                    <span className="mt-0.5 block italic">{request.review_note}</span>
                  )}
                </span>,
              ],
            }))}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Need the full timetable?{" "}
        <Link href="/institution/timetables/versions" className="underline hover:text-foreground">
          Version history
        </Link>{" "}
        shows what each approval produced.
      </p>
    </div>
  );
}
