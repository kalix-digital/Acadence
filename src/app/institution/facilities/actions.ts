"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  FACILITY_ENTITIES,
  isFacilityEntity,
  type FacilityEntity,
} from "@/lib/facilities/constants";
import {
  parseAvailability,
  parseBooking,
  parseBuilding,
  parseFeature,
  parseRoom,
  parseRoomFeature,
} from "@/lib/facilities/validation";
import { requireFacilitiesAccess } from "@/lib/facilities/access";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

function entityFrom(formData: FormData): FacilityEntity | null {
  const value = String(formData.get("entity") ?? "");
  return isFacilityEntity(value) ? value : null;
}

function invalid(errors: Record<string, string>): FormState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: errors,
  };
}

type DbError = { code?: string; message: string };

function dbError(
  scope: string,
  error: DbError,
  duplicate = "A record with that code already exists in this institution.",
  duplicateField = "code",
): FormState {
  console.error(`[facilities] ${scope}`, error.message);

  // Domain rules raised by the database carry a message written for the user.
  if (error.code === "P0001") {
    return { status: "error", message: error.message };
  }

  if (error.code === "23P01") {
    return {
      status: "error",
      message:
        "That room is already booked for part of that time. Choose another time or room.",
      fieldErrors: { startTime: "This slot overlaps a confirmed booking." },
    };
  }

  if (error.code === "23505") {
    return {
      status: "error",
      message: duplicate,
      fieldErrors: { [duplicateField]: "This value is already in use." },
    };
  }

  if (error.code === "42501") {
    return {
      status: "error",
      message:
        "Your role cannot change facilities at this level. Ask an administrator for the right scope.",
    };
  }

  if (error.code === "23503") {
    return {
      status: "error",
      message: "That reference belongs to a different part of the institution.",
    };
  }

  if (error.code === "23514") {
    return { status: "error", message: "One of the values breaks a rule for this record." };
  }

  return { status: "error", message: "The record could not be saved. Try again." };
}

/**
 * A building always belongs to a campus. When the institution has none yet, the
 * first building creates a "Main campus" instead of blocking the user with a
 * setup step they did not ask for (OQ-027).
 */
async function resolveCampusId(
  institutionId: string,
  campusId: string | null,
): Promise<{ id: string | null; error: DbError | null }> {
  if (campusId) return { id: campusId, error: null };

  const supabase = await createClient();
  const existing = await supabase
    .from("campuses")
    .select("id")
    .eq("institution_id", institutionId)
    .is("archived_at", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (existing.error) return { id: null, error: existing.error };
  if (existing.data?.id) return { id: existing.data.id, error: null };

  const created = await supabase
    .from("campuses")
    .insert({ institution_id: institutionId, name: "Main campus", code: "MAIN" })
    .select("id")
    .single();

  if (!created.error) return { id: created.data.id, error: null };

  // A concurrent create won the race; reuse whatever campus now exists.
  if (created.error.code === "23505") {
    const retry = await supabase
      .from("campuses")
      .select("id")
      .eq("institution_id", institutionId)
      .limit(1)
      .maybeSingle();
    return { id: retry.data?.id ?? null, error: retry.error };
  }

  return { id: null, error: created.error };
}

/** Creates or updates one facilities record. */
export async function saveFacilityRecordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireFacilitiesAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return { status: "error", message: "No active institution selected." };
  }

  const entity = entityFrom(formData);
  if (!entity) {
    return { status: "error", message: "Unknown facilities record type." };
  }

  const rawId = String(formData.get("id") ?? "");
  const id = rawId || null;
  const supabase = await createClient();
  const path = FACILITY_ENTITIES[entity].path;
  let error: DbError | null = null;
  let duplicate = "A record with that code already exists in this institution.";
  let duplicateField = "code";

  switch (entity) {
    case "building": {
      const parsed = parseBuilding(formData);
      if (!parsed.ok) return invalid(parsed.errors);

      const campus = await resolveCampusId(institutionId, parsed.data.campusId);
      if (campus.error || !campus.id) {
        return dbError("building campus", campus.error ?? { message: "No campus available." });
      }

      const values = {
        name: parsed.data.name,
        code: parsed.data.code,
        campus_id: campus.id,
        address: parsed.data.address,
        notes: parsed.data.notes,
      };
      const result = id
        ? await supabase
            .from("buildings")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("buildings").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "room": {
      const parsed = parseRoom(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        building_id: parsed.data.buildingId,
        name: parsed.data.name,
        code: parsed.data.code,
        room_type: parsed.data.roomType,
        capacity: parsed.data.capacity,
        floor: parsed.data.floor,
        accessibility_notes: parsed.data.accessibilityNotes,
      };
      const result = id
        ? await supabase
            .from("rooms")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase.from("rooms").insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "feature": {
      const parsed = parseFeature(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      duplicate = "A feature with that name already exists in this institution.";
      duplicateField = "name";
      const values = { name: parsed.data.name, category: parsed.data.category };
      const result = id
        ? await supabase
            .from("room_features")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("room_features")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "roomFeature": {
      const parsed = parseRoomFeature(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      duplicate = "That feature is already linked to this room.";
      duplicateField = "featureId";
      const values = {
        room_id: parsed.data.roomId,
        feature_id: parsed.data.featureId,
        quantity: parsed.data.quantity,
      };
      const result = id
        ? await supabase
            .from("room_feature_links")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("room_feature_links")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "availability": {
      const parsed = parseAvailability(formData);
      if (!parsed.ok) return invalid(parsed.errors);
      const values = {
        room_id: parsed.data.roomId,
        semester_id: parsed.data.semesterId,
        day_of_week: parsed.data.dayOfWeek,
        opens_at: parsed.data.opensAt,
        closes_at: parsed.data.closesAt,
      };
      const result = id
        ? await supabase
            .from("room_availability")
            .update(values)
            .eq("id", id)
            .eq("institution_id", institutionId)
        : await supabase
            .from("room_availability")
            .insert({ ...values, institution_id: institutionId });
      error = result.error;
      break;
    }

    case "booking": {
      const parsed = parseBooking(formData);
      if (!parsed.ok) return invalid(parsed.errors);

      // Bookings are auto-approved (OQ-014) and never edited in place: cancel
      // and re-book, so the overlap rule always sees a fresh interval.
      const { error: insertError } = await supabase.from("room_bookings").insert({
        institution_id: institutionId,
        room_id: parsed.data.roomId,
        semester_id: parsed.data.semesterId,
        department_id: parsed.data.departmentId,
        title: parsed.data.title,
        purpose: parsed.data.purpose,
        starts_at: parsed.data.startsAt,
        ends_at: parsed.data.endsAt,
        expected_attendees: parsed.data.expectedAttendees,
        booked_by: context.user.id,
      });
      error = insertError;

      if (!insertError) {
        revalidatePath("/institution/facilities");
        revalidatePath("/institution/facilities/bookings");
        revalidatePath("/institution/facilities/utilisation");
        return { status: "success", message: "Booking confirmed." };
      }
      break;
    }
  }

  if (error) return dbError(entity, error, duplicate, duplicateField);

  revalidatePath("/institution/facilities");
  revalidatePath(path);
  revalidatePath("/institution/facilities/utilisation");

  return {
    status: "success",
    message: id ? "Changes saved." : "Record created.",
  };
}

/** Archives or restores a facilities record. Deletion is not offered. */
export async function archiveFacilityRecordAction(formData: FormData) {
  const context = await requireFacilitiesAccess();
  const institutionId = context.membership.institutionId;
  const entity = entityFrom(formData);
  const id = String(formData.get("id") ?? "");
  const archived = String(formData.get("archived") ?? "1") !== "0";

  if (!institutionId || !entity || !id || entity === "booking") {
    redirect("/institution/facilities?error=invalid");
  }

  const supabase = await createClient();
  const path = FACILITY_ENTITIES[entity].path;

  const { error } = await supabase
    .from(FACILITY_ENTITIES[entity].table)
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("institution_id", institutionId);

  if (error) {
    console.error("[facilities] archive failed", error.message);
    const message =
      error.code === "P0001"
        ? error.message
        : "That record could not be updated.";
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/institution/facilities");
  revalidatePath(path);
  redirect(`${path}?updated=${archived ? "archived" : "restored"}`);
}

/** Cancels a confirmed booking, freeing its slot. */
export async function cancelBookingAction(formData: FormData) {
  const context = await requireFacilitiesAccess();
  const institutionId = context.membership.institutionId;
  const id = String(formData.get("id") ?? "");

  if (!institutionId || !id) {
    redirect("/institution/facilities/bookings?error=invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("room_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: context.user.id,
    })
    .eq("id", id)
    .eq("institution_id", institutionId);

  if (error) {
    console.error("[facilities] cancel failed", error.message);
    redirect(
      `/institution/facilities/bookings?error=${encodeURIComponent(
        error.code === "42501"
          ? "Your role cannot cancel that booking."
          : "That booking could not be cancelled.",
      )}`,
    );
  }

  revalidatePath("/institution/facilities");
  revalidatePath("/institution/facilities/bookings");
  revalidatePath("/institution/facilities/utilisation");
  redirect("/institution/facilities/bookings?updated=cancelled");
}
