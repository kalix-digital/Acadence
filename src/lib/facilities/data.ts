import { FACILITY_PAGE_SIZE } from "@/lib/facilities/constants";
import type { UtilisationRoom } from "@/lib/facilities/utilisation";
import { createClient } from "@/lib/supabase/server";
import type {
  BuildingRow,
  CalendarEventRow,
  RoomAvailabilityRow,
  RoomBookingRow,
  RoomFeatureLinkRow,
  RoomFeatureRow,
  RoomRow,
  RoomType,
  SemesterRow,
} from "@/types/database";

export type FacilityListParams = {
  q?: string;
  archived?: boolean;
  page?: number;
};

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
};

export type BuildingListItem = BuildingRow & { campusName: string };

export type RoomListItem = RoomRow & {
  buildingName: string;
  campusName: string;
};

export type RoomFeatureListItem = RoomFeatureLinkRow & {
  roomName: string;
  roomCode: string;
  featureName: string;
};

export type AvailabilityListItem = RoomAvailabilityRow & {
  roomName: string;
  roomCode: string;
  semesterName: string;
  sessionName: string;
};

export type BookingListItem = RoomBookingRow & {
  roomName: string;
  roomCode: string;
  semesterName: string;
  departmentName: string | null;
};

export type FacilityLookups = {
  campuses: { id: string; name: string; code: string }[];
  buildings: { id: string; name: string; code: string; campusId: string }[];
  rooms: { id: string; name: string; code: string; capacity: number; buildingId: string }[];
  semesters: {
    id: string;
    name: string;
    sessionName: string;
    teachingStartsOn: string;
    teachingEndsOn: string;
  }[];
  features: { id: string; name: string }[];
  departments: { id: string; name: string; code: string }[];
};

type QueryOutcome<T> = {
  data: T[] | null;
  count: number | null;
  error: { message: string } | null;
};

function fail(scope: string, message: string): never {
  console.error(`[facilities] ${scope}`, message);
  throw new Error(`Could not load ${scope}. ${message}`);
}

/** PostgREST splits `.or()` on commas, so user input must not contain them. */
function term(q?: string) {
  return (q ?? "").trim().replace(/[,()*"\\]/g, " ").slice(0, 60);
}

function pageOf(params: FacilityListParams) {
  const page = Number.isInteger(params.page) && (params.page ?? 0) > 0 ? (params.page as number) : 1;
  return { page, from: (page - 1) * FACILITY_PAGE_SIZE, to: page * FACILITY_PAGE_SIZE - 1 };
}

function shape<T>(scope: string, outcome: QueryOutcome<T>, page: number): Paged<T> {
  if (outcome.error) fail(scope, outcome.error.message);
  const total = outcome.count ?? outcome.data?.length ?? 0;
  return {
    rows: outcome.data ?? [],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / FACILITY_PAGE_SIZE)),
  };
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------
export async function facilityLookups(institutionId: string): Promise<FacilityLookups> {
  const supabase = await createClient();

  const [campuses, buildings, rooms, semesters, sessions, features, departments] = await Promise.all([
    supabase
      .from("campuses")
      .select("id, name, code")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("buildings")
      .select("id, name, code, campus_id")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("rooms")
      .select("id, name, code, capacity, building_id")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("semesters")
      .select("id, name, session_id, teaching_starts_on, teaching_ends_on")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("teaching_starts_on", { ascending: false }),
    supabase
      .from("academic_sessions")
      .select("id, name")
      .eq("institution_id", institutionId),
    supabase
      .from("room_features")
      .select("id, name")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("departments")
      .select("id, name, code")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
  ]);

  for (const [scope, outcome] of [
    ["campuses", campuses],
    ["buildings", buildings],
    ["rooms", rooms],
    ["semesters", semesters],
    ["academic sessions", sessions],
    ["room features", features],
    ["departments", departments],
  ] as const) {
    if (outcome.error) fail(scope, outcome.error.message);
  }

  const sessionNames = new Map(
    ((sessions.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  return {
    campuses: (campuses.data ?? []) as FacilityLookups["campuses"],
    buildings: ((buildings.data ?? []) as { id: string; name: string; code: string; campus_id: string }[]).map(
      (row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        campusId: row.campus_id,
      }),
    ),
    rooms: ((rooms.data ?? []) as { id: string; name: string; code: string; capacity: number; building_id: string }[]).map(
      (row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        capacity: row.capacity,
        buildingId: row.building_id,
      }),
    ),
    semesters: (
      (semesters.data ?? []) as {
        id: string;
        name: string;
        session_id: string;
        teaching_starts_on: string;
        teaching_ends_on: string;
      }[]
    ).map((row) => ({
      id: row.id,
      name: row.name,
      sessionName: sessionNames.get(row.session_id) ?? "Session",
      teachingStartsOn: row.teaching_starts_on,
      teachingEndsOn: row.teaching_ends_on,
    })),
    features: (features.data ?? []) as FacilityLookups["features"],
    departments: (departments.data ?? []) as FacilityLookups["departments"],
  };
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
export async function listBuildings(
  institutionId: string,
  params: FacilityListParams = {},
): Promise<Paged<BuildingListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("buildings")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);

  const [outcome, campuses] = await Promise.all([
    query.order("name").range(from, to),
    supabase
      .from("campuses")
      .select("id, name")
      .eq("institution_id", institutionId),
  ]);

  if (campuses.error) fail("campuses", campuses.error.message);

  const campusNames = new Map(
    ((campuses.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  const rows = ((outcome.data ?? []) as BuildingRow[]).map((row) => ({
    ...row,
    campusName: campusNames.get(row.campus_id) ?? "—",
  }));

  return shape(
    "buildings",
    { data: rows, count: outcome.count, error: outcome.error },
    page,
  );
}

export async function getBuilding(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("building", error.message);
  return (data as BuildingRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export async function listRooms(
  institutionId: string,
  params: FacilityListParams & { buildingId?: string; roomType?: RoomType } = {},
): Promise<Paged<RoomListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("rooms")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`);
  if (params.buildingId) query = query.eq("building_id", params.buildingId);
  if (params.roomType) query = query.eq("room_type", params.roomType);

  const [outcome, buildings, campuses] = await Promise.all([
    query.order("name").range(from, to),
    supabase
      .from("buildings")
      .select("id, name, campus_id")
      .eq("institution_id", institutionId),
    supabase
      .from("campuses")
      .select("id, name")
      .eq("institution_id", institutionId),
  ]);

  if (buildings.error) fail("buildings", buildings.error.message);
  if (campuses.error) fail("campuses", campuses.error.message);

  const campusNames = new Map(
    ((campuses.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );
  const buildingRows = (buildings.data ?? []) as { id: string; name: string; campus_id: string }[];
  const buildingNames = new Map(buildingRows.map((row) => [row.id, row.name]));
  const buildingCampuses = new Map(buildingRows.map((row) => [row.id, row.campus_id]));

  const rows = ((outcome.data ?? []) as RoomRow[]).map((row) => {
    const campusId = buildingCampuses.get(row.building_id);
    return {
      ...row,
      buildingName: buildingNames.get(row.building_id) ?? "—",
      campusName: campusId ? campusNames.get(campusId) ?? "—" : "—",
    };
  });

  return shape("rooms", { data: rows, count: outcome.count, error: outcome.error }, page);
}

export async function getRoom(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("room", error.message);
  return (data as RoomRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Feature catalogue and room equipment
// ---------------------------------------------------------------------------
export async function listFeatures(
  institutionId: string,
  params: FacilityListParams = {},
): Promise<Paged<RoomFeatureRow>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("room_features")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (q) query = query.ilike("name", `%${q}%`);

  const outcome = await query.order("name").range(from, to);
  return shape("room features", outcome as QueryOutcome<RoomFeatureRow>, page);
}

export async function getFeature(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_features")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("room feature", error.message);
  return (data as RoomFeatureRow | null) ?? null;
}

export async function listRoomFeatures(
  institutionId: string,
  params: { roomId?: string; archived?: boolean; all?: boolean } = {},
): Promise<RoomFeatureListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("room_feature_links")
    .select("*")
    .eq("institution_id", institutionId);
  // `all` keeps archived links on screen so they can be restored.
  if (!params.all) {
    query = params.archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null);
  }
  if (params.roomId) query = query.eq("room_id", params.roomId);

  const [outcome, rooms, features] = await Promise.all([
    query.order("created_at", { ascending: false }).limit(200),
    supabase.from("rooms").select("id, name, code").eq("institution_id", institutionId),
    supabase.from("room_features").select("id, name").eq("institution_id", institutionId),
  ]);

  if (outcome.error) fail("room equipment", outcome.error.message);
  if (rooms.error) fail("rooms", rooms.error.message);
  if (features.error) fail("room features", features.error.message);

  const roomRows = new Map(
    ((rooms.data ?? []) as { id: string; name: string; code: string }[]).map((row) => [row.id, row]),
  );
  const featureNames = new Map(
    ((features.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  return ((outcome.data ?? []) as RoomFeatureLinkRow[]).map((row) => {
    const room = roomRows.get(row.room_id);
    return {
      ...row,
      roomName: room?.name ?? "—",
      roomCode: room?.code ?? "",
      featureName: featureNames.get(row.feature_id) ?? "—",
    };
  });
}

export async function getRoomFeature(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_feature_links")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("room equipment", error.message);
  return (data as RoomFeatureLinkRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------
export async function listAvailability(
  institutionId: string,
  params: FacilityListParams & { semesterId?: string; roomId?: string } = {},
): Promise<Paged<AvailabilityListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);

  let query = supabase
    .from("room_availability")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId);

  query = params.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (params.semesterId) query = query.eq("semester_id", params.semesterId);
  if (params.roomId) query = query.eq("room_id", params.roomId);

  const [outcome, rooms, semesters, sessions] = await Promise.all([
    query
      .order("day_of_week")
      .order("opens_at")
      .range(from, to),
    supabase.from("rooms").select("id, name, code").eq("institution_id", institutionId),
    supabase
      .from("semesters")
      .select("id, name, session_id")
      .eq("institution_id", institutionId),
    supabase.from("academic_sessions").select("id, name").eq("institution_id", institutionId),
  ]);

  if (rooms.error) fail("rooms", rooms.error.message);
  if (semesters.error) fail("semesters", semesters.error.message);
  if (sessions.error) fail("academic sessions", sessions.error.message);

  const roomRows = new Map(
    ((rooms.data ?? []) as { id: string; name: string; code: string }[]).map((row) => [row.id, row]),
  );
  const sessionNames = new Map(
    ((sessions.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );
  const semesterRows = new Map(
    ((semesters.data ?? []) as { id: string; name: string; session_id: string }[]).map((row) => [row.id, row]),
  );

  const rows = ((outcome.data ?? []) as RoomAvailabilityRow[]).map((row) => {
    const room = roomRows.get(row.room_id);
    const semester = semesterRows.get(row.semester_id);
    return {
      ...row,
      roomName: room?.name ?? "—",
      roomCode: room?.code ?? "",
      semesterName: semester?.name ?? "—",
      sessionName: semester ? sessionNames.get(semester.session_id) ?? "—" : "—",
    };
  });

  return shape("availability", { data: rows, count: outcome.count, error: outcome.error }, page);
}

export async function getAvailability(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_availability")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("availability window", error.message);
  return (data as RoomAvailabilityRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export async function listBookings(
  institutionId: string,
  params: FacilityListParams & { semesterId?: string; roomId?: string; status?: string } = {},
): Promise<Paged<BookingListItem>> {
  const supabase = await createClient();
  const { page, from, to } = pageOf(params);
  const q = term(params.q);

  let query = supabase
    .from("room_bookings")
    .select("*", { count: "exact" })
    .eq("institution_id", institutionId);

  if (params.semesterId) query = query.eq("semester_id", params.semesterId);
  if (params.roomId) query = query.eq("room_id", params.roomId);
  if (params.status === "confirmed" || params.status === "cancelled") {
    query = query.eq("status", params.status);
  }
  if (q) query = query.ilike("title", `%${q}%`);

  const [outcome, rooms, semesters, departments] = await Promise.all([
    query.order("starts_at", { ascending: false }).range(from, to),
    supabase.from("rooms").select("id, name, code").eq("institution_id", institutionId),
    supabase.from("semesters").select("id, name").eq("institution_id", institutionId),
    supabase.from("departments").select("id, name").eq("institution_id", institutionId),
  ]);

  if (rooms.error) fail("rooms", rooms.error.message);
  if (semesters.error) fail("semesters", semesters.error.message);
  if (departments.error) fail("departments", departments.error.message);

  const roomRows = new Map(
    ((rooms.data ?? []) as { id: string; name: string; code: string }[]).map((row) => [row.id, row]),
  );
  const semesterNames = new Map(
    ((semesters.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );
  const departmentNames = new Map(
    ((departments.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );

  const rows = ((outcome.data ?? []) as RoomBookingRow[]).map((row) => {
    const room = roomRows.get(row.room_id);
    return {
      ...row,
      roomName: room?.name ?? "—",
      roomCode: room?.code ?? "",
      semesterName: semesterNames.get(row.semester_id) ?? "—",
      departmentName: row.department_id ? departmentNames.get(row.department_id) ?? null : null,
    };
  });

  return shape("bookings", { data: rows, count: outcome.count, error: outcome.error }, page);
}

export async function getBooking(institutionId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_bookings")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("booking", error.message);
  return (data as RoomBookingRow | null) ?? null;
}

// ---------------------------------------------------------------------------
// Overview and utilisation inputs
// ---------------------------------------------------------------------------
export type FacilitiesSummary = {
  buildings: number;
  rooms: number;
  seats: number;
  features: number;
  upcomingBookings: number;
};

export async function facilitiesSummary(institutionId: string): Promise<FacilitiesSummary> {
  const supabase = await createClient();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const [buildings, rooms, features, upcoming, capacities] = await Promise.all([
    supabase
      .from("buildings")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .is("archived_at", null),
    supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .is("archived_at", null),
    supabase
      .from("room_features")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .is("archived_at", null),
    supabase
      .from("room_bookings")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .eq("status", "confirmed")
      .gte("ends_at", now),
    supabase
      .from("rooms")
      .select("capacity")
      .eq("institution_id", institutionId)
      .is("archived_at", null),
  ]);

  if (buildings.error) fail("buildings", buildings.error.message);
  if (rooms.error) fail("rooms", rooms.error.message);
  if (features.error) fail("room features", features.error.message);
  if (upcoming.error) fail("bookings", upcoming.error.message);
  if (capacities.error) fail("rooms", capacities.error.message);

  const seats = ((capacities.data ?? []) as { capacity: number }[]).reduce(
    (total, row) => total + row.capacity,
    0,
  );

  return {
    buildings: buildings.count ?? 0,
    rooms: rooms.count ?? 0,
    seats,
    features: features.count ?? 0,
    upcomingBookings: upcoming.count ?? 0,
  };
}

export type UtilisationData = {
  semester: SemesterRow | null;
  rooms: UtilisationRoom[];
  availability: RoomAvailabilityRow[];
  bookings: RoomBookingRow[];
  events: CalendarEventRow[];
};

/** Everything the utilisation report needs for one semester, resolved in TypeScript. */
export async function utilisationData(
  institutionId: string,
  semesterId: string,
): Promise<UtilisationData> {
  const supabase = await createClient();

  const semesterResult = await supabase
    .from("semesters")
    .select("*")
    .eq("institution_id", institutionId)
    .eq("id", semesterId)
    .maybeSingle();

  if (semesterResult.error) fail("semester", semesterResult.error.message);
  const semester = (semesterResult.data as SemesterRow | null) ?? null;
  if (!semester) {
    return { semester: null, rooms: [], availability: [], bookings: [], events: [] };
  }

  const [rooms, buildings, campuses, availability, bookings, events] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, code, capacity, building_id")
      .eq("institution_id", institutionId)
      .is("archived_at", null)
      .order("name"),
    supabase.from("buildings").select("id, name, campus_id").eq("institution_id", institutionId),
    supabase.from("campuses").select("id, name").eq("institution_id", institutionId),
    supabase
      .from("room_availability")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("semester_id", semesterId)
      .is("archived_at", null),
    supabase
      .from("room_bookings")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("semester_id", semesterId),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("session_id", semester.session_id),
  ]);

  if (rooms.error) fail("rooms", rooms.error.message);
  if (buildings.error) fail("buildings", buildings.error.message);
  if (campuses.error) fail("campuses", campuses.error.message);
  if (availability.error) fail("availability", availability.error.message);
  if (bookings.error) fail("bookings", bookings.error.message);
  if (events.error) fail("calendar events", events.error.message);

  const campusNames = new Map(
    ((campuses.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]),
  );
  const buildingRows = (buildings.data ?? []) as { id: string; name: string; campus_id: string }[];
  const buildingNames = new Map(buildingRows.map((row) => [row.id, row.name]));
  const buildingCampuses = new Map(buildingRows.map((row) => [row.id, row.campus_id]));

  const shaped: UtilisationRoom[] = (
    (rooms.data ?? []) as { id: string; name: string; code: string; capacity: number; building_id: string }[]
  ).map((row) => {
    const campusId = buildingCampuses.get(row.building_id);
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      capacity: row.capacity,
      buildingName: buildingNames.get(row.building_id) ?? "—",
      campusName: campusId ? campusNames.get(campusId) ?? "—" : "—",
    };
  });

  return {
    semester,
    rooms: shaped,
    availability: (availability.data ?? []) as RoomAvailabilityRow[],
    bookings: (bookings.data ?? []) as RoomBookingRow[],
    events: (events.data ?? []) as CalendarEventRow[],
  };
}
