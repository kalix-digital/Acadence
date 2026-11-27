import { ROOM_TYPES, labelForValue } from "@/lib/academics/constants";
import type { BookingStatus, RoomFeatureCategory } from "@/types/database";

/** Facility entities the facilities screens can create, edit and archive. */
export type FacilityEntity =
  | "building"
  | "room"
  | "feature"
  | "roomFeature"
  | "availability"
  | "booking";

export type FacilityEntityConfig = {
  label: string;
  singular: string;
  path: string;
  /** Table name in the generated database types. */
  table:
    | "buildings"
    | "rooms"
    | "room_features"
    | "room_feature_links"
    | "room_availability"
    | "room_bookings";
  /** Capability needed to reach the screen. */
  capability: "manage_facilities";
};

export const FACILITY_ENTITIES: Record<FacilityEntity, FacilityEntityConfig> = {
  building: {
    label: "Buildings",
    singular: "Building",
    path: "/institution/facilities/buildings",
    table: "buildings",
    capability: "manage_facilities",
  },
  room: {
    label: "Rooms",
    singular: "Room",
    path: "/institution/facilities/rooms",
    table: "rooms",
    capability: "manage_facilities",
  },
  feature: {
    label: "Room features",
    singular: "Feature",
    path: "/institution/facilities/features",
    table: "room_features",
    capability: "manage_facilities",
  },
  roomFeature: {
    label: "Room equipment",
    singular: "Room feature",
    path: "/institution/facilities/rooms",
    table: "room_feature_links",
    capability: "manage_facilities",
  },
  availability: {
    label: "Room availability",
    singular: "Availability window",
    path: "/institution/facilities/availability",
    table: "room_availability",
    capability: "manage_facilities",
  },
  booking: {
    label: "Room bookings",
    singular: "Booking",
    path: "/institution/facilities/bookings",
    table: "room_bookings",
    capability: "manage_facilities",
  },
};

export function isFacilityEntity(value: string): value is FacilityEntity {
  return Object.prototype.hasOwnProperty.call(FACILITY_ENTITIES, value);
}

export const FACILITY_PAGE_SIZE = 20;

/**
 * The room vocabulary is shared with `courses.required_room_type`, so a
 * suitability check in a later phase compares the two without a mapping table.
 */
export const ROOM_TYPE_OPTIONS = ROOM_TYPES;

export const FEATURE_CATEGORIES: readonly RoomFeatureCategory[] = [
  "equipment",
  "accessibility",
  "layout",
  "other",
];

export const BOOKING_STATUSES: readonly BookingStatus[] = ["confirmed", "cancelled"];

/** ISO-8601 weekday numbers, which is what `room_availability.day_of_week` stores. */
export const WEEKDAYS: readonly { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

export function weekdayLabel(value: number) {
  return WEEKDAYS.find((day) => day.value === value)?.label ?? "Unknown day";
}

export { labelForValue };
