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
import {
  FACILITY_ENTITIES,
  ROOM_TYPE_OPTIONS,
  labelForValue,
} from "@/lib/facilities/constants";
import {
  facilityLookups,
  getRoom,
  listRoomFeatures,
  listRooms,
} from "@/lib/facilities/data";
import type { RoomType } from "@/types/database";

export const metadata: Metadata = { title: "Rooms" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    building?: string;
    type?: string;
    edit?: string;
    editEquipment?: string;
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
  const roomType = ROOM_TYPE_OPTIONS.includes(params.type as RoomType)
    ? (params.type as RoomType)
    : undefined;

  const [rooms, lookups, editing, equipment] = await Promise.all([
    listRooms(institutionId, {
      q: params.q,
      archived,
      page,
      buildingId: params.building,
      roomType,
    }),
    facilityLookups(institutionId),
    params.edit ? getRoom(institutionId, params.edit) : Promise.resolve(null),
    listRoomFeatures(institutionId, { all: true }),
  ]);

  const basePath = FACILITY_ENTITIES.room.path;

  return (
    <div className="space-y-5">
      <div>
        <FacilitiesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Rooms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classrooms, lecture halls, laboratories, studios and seminar rooms share one
          list, using the same room types courses require.
        </p>
      </div>

      <FacilitiesNav current="room" />
      <FacilityFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit room" : "Add room"}</CardTitle>
          <CardDescription>
            Capacity is a hard limit: a booking cannot ask for more seats than the room
            has, and the room cannot be shrunk below a confirmed booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FacilityForm entity="room" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{FACILITY_ENTITIES.room.label}</CardTitle>
          <CardDescription>Search, filter by building or type, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FacilityToolbar
            basePath={basePath}
            q={params.q}
            archived={archived}
            total={rooms.total}
          />

          <form className="flex flex-wrap items-center gap-2">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            {archived && <input type="hidden" name="archived" value="1" />}
            <select name="building" defaultValue={params.building ?? ""} className={selectClass}>
              <option value="">All buildings</option>
              {lookups.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.code} · {building.name}
                </option>
              ))}
            </select>
            <select name="type" defaultValue={params.type ?? ""} className={selectClass}>
              <option value="">All types</option>
              {ROOM_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {labelForValue(type)}
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
            columns={["Room", "Building", "Type", "Seats", "Accessibility"]}
            empty={archived ? "No archived rooms." : "No rooms yet."}
            rows={rooms.rows.map((room) => ({
              id: room.id,
              archived: Boolean(room.archived_at),
              cells: [
                <span key="room">
                  <span className="font-mono text-xs text-muted-foreground">{room.code}</span>
                  <span className="mt-0.5 block font-medium">{room.name}</span>
                  {room.floor && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Floor {room.floor}
                    </span>
                  )}
                </span>,
                <span key="building" className="text-xs">
                  {room.buildingName}
                  <span className="mt-0.5 block text-muted-foreground">{room.campusName}</span>
                </span>,
                <span key="type" className="text-xs">
                  {labelForValue(room.room_type)}
                </span>,
                <span key="capacity" className="text-xs tabular-nums">
                  {room.capacity}
                </span>,
                <span key="accessibility" className="text-xs text-muted-foreground">
                  {room.accessibility_notes ?? "—"}
                </span>,
              ],
              actions: (
                <>
                  <EditLink basePath={basePath} id={room.id} />
                  <ArchiveButton
                    entity="room"
                    id={room.id}
                    archived={Boolean(room.archived_at)}
                  />
                </>
              ),
            }))}
          />

          <FacilityPagination
            basePath={basePath}
            page={rooms.page}
            pageCount={rooms.pageCount}
            q={params.q}
            archived={archived}
            extraParams={{ building: params.building, type: params.type }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room equipment</CardTitle>
          <CardDescription>
            Link a feature from the catalogue to a room. Phase 7 uses these links to check
            that a laboratory course lands in a laboratory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FacilityForm entity="roomFeature" lookups={lookups} />

          <FacilityTable
            columns={["Room", "Feature", "Quantity"]}
            empty="No equipment recorded yet."
            rows={equipment.map((link) => ({
              id: link.id,
              archived: Boolean(link.archived_at),
              cells: [
                <span key="room">
                  <span className="font-mono text-xs text-muted-foreground">{link.roomCode}</span>
                  <span className="mt-0.5 block">{link.roomName}</span>
                </span>,
                <span key="feature" className="text-xs">
                  {link.featureName}
                </span>,
                <span key="quantity" className="text-xs tabular-nums">
                  {link.quantity ?? "—"}
                </span>,
              ],
              actions: (
                <ArchiveButton
                  entity="roomFeature"
                  id={link.id}
                  archived={Boolean(link.archived_at)}
                />
              ),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
