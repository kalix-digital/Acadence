"use client";

import { useActionState } from "react";
import { saveFacilityRecordAction } from "@/app/institution/facilities/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import {
  FEATURE_CATEGORIES,
  ROOM_TYPE_OPTIONS,
  WEEKDAYS,
  labelForValue,
  type FacilityEntity,
} from "@/lib/facilities/constants";
import type { FacilityLookups } from "@/lib/facilities/data";
import { IDLE_FORM_STATE } from "@/lib/forms";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type RecordValues = Record<string, unknown> | null | undefined;

function str(record: RecordValues, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function num(record: RecordValues, key: string) {
  const value = record?.[key];
  return typeof value === "number" ? value : "";
}

function clock(record: RecordValues, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value.slice(0, 5) : "";
}

function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  id,
  name,
  defaultValue,
  options,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} className={selectClass}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function blocker(entity: FacilityEntity, lookups: FacilityLookups) {
  if ((entity === "room" || entity === "roomFeature" || entity === "availability" || entity === "booking") &&
      lookups.rooms.length === 0) {
    return "Create a room first.";
  }
  if (entity === "room" && lookups.buildings.length === 0) {
    return "Create a building first.";
  }
  if (entity === "roomFeature" && lookups.features.length === 0) {
    return "Add a feature to the catalogue first.";
  }
  if ((entity === "availability" || entity === "booking") && lookups.semesters.length === 0) {
    return "Create a semester in academic administration first.";
  }
  return null;
}

export function FacilityForm({
  entity,
  record,
  lookups,
  today,
  lockedDepartmentId,
}: {
  entity: FacilityEntity;
  record?: RecordValues;
  lookups: FacilityLookups;
  /** Server-rendered date so the booking form does not hydrate differently. */
  today?: string;
  /** Department administrators may only book for their own department. */
  lockedDepartmentId?: string | null;
}) {
  const [state, formAction] = useActionState(saveFacilityRecordAction, IDLE_FORM_STATE);
  const errors = state.fieldErrors ?? {};
  const blocked = blocker(entity, lookups);
  const id = record && typeof record.id === "string" ? record.id : "";
  const editing = Boolean(id);

  const roomOptions = lookups.rooms.map((room) => ({
    value: room.id,
    label: `${room.code} · ${room.name} (${room.capacity} seats)`,
  }));
  const buildingOptions = lookups.buildings.map((building) => ({
    value: building.id,
    label: `${building.code} · ${building.name}`,
  }));
  const semesterOptions = lookups.semesters.map((semester) => ({
    value: semester.id,
    label: `${semester.name} · ${semester.sessionName}`,
  }));
  const departmentOptions = (
    lockedDepartmentId
      ? lookups.departments.filter((department) => department.id === lockedDepartmentId)
      : lookups.departments
  ).map((department) => ({
    value: department.id,
    label: `${department.code} · ${department.name}`,
  }));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="entity" value={entity} />
      {editing && <input type="hidden" name="id" value={id} />}

      {blocked && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {blocked}
        </p>
      )}

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          {state.message}
        </p>
      )}

      {entity === "building" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Building name" error={errors.name}>
            <Input id="name" name="name" defaultValue={str(record, "name")} required className="h-9" />
          </Field>
          <Field htmlFor="code" label="Code" hint="Short code, e.g. EB." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <Field
            htmlFor="campusId"
            label="Campus"
            hint={lookups.campuses.length === 0 ? "No campus yet: a Main campus is created automatically." : undefined}
            error={errors.campusId}
          >
            <Select
              id="campusId"
              name="campusId"
              defaultValue={str(record, "campus_id")}
              options={lookups.campuses.map((campus) => ({
                value: campus.id,
                label: `${campus.code} · ${campus.name}`,
              }))}
              placeholder={lookups.campuses.length === 0 ? "Create Main campus automatically" : "Choose campus"}
            />
          </Field>
          <Field htmlFor="address" label="Address" hint="Optional." error={errors.address}>
            <Input id="address" name="address" defaultValue={str(record, "address")} className="h-9" />
          </Field>
          <div className="sm:col-span-2">
            <Field htmlFor="notes" label="Notes" hint="Optional." error={errors.notes}>
              <Input id="notes" name="notes" defaultValue={str(record, "notes")} className="h-9" />
            </Field>
          </div>
        </div>
      )}

      {entity === "room" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="buildingId" label="Building" error={errors.buildingId}>
            <Select
              id="buildingId"
              name="buildingId"
              defaultValue={str(record, "building_id")}
              options={buildingOptions}
              placeholder="Choose building"
            />
          </Field>
          <Field htmlFor="name" label="Room name" error={errors.name}>
            <Input id="name" name="name" defaultValue={str(record, "name")} required className="h-9" />
          </Field>
          <Field htmlFor="code" label="Code" hint="Short code, e.g. HALL-A." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <Field
            htmlFor="roomType"
            label="Room type"
            hint="The same vocabulary courses use to require a room."
            error={errors.roomType}
          >
            <Select
              id="roomType"
              name="roomType"
              defaultValue={str(record, "room_type") || "classroom"}
              options={ROOM_TYPE_OPTIONS.map((type) => ({
                value: type,
                label: labelForValue(type),
              }))}
            />
          </Field>
          <Field htmlFor="capacity" label="Capacity (seats)" error={errors.capacity}>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              max={5000}
              defaultValue={num(record, "capacity")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="floor" label="Floor" hint="Optional." error={errors.floor}>
            <Input id="floor" name="floor" defaultValue={str(record, "floor")} className="h-9" />
          </Field>
          <div className="sm:col-span-2">
            <Field
              htmlFor="accessibilityNotes"
              label="Accessibility"
              hint="Lift access, step-free route, hearing loop. Optional."
              error={errors.accessibilityNotes}
            >
              <Input
                id="accessibilityNotes"
                name="accessibilityNotes"
                defaultValue={str(record, "accessibility_notes")}
                className="h-9"
              />
            </Field>
          </div>
        </div>
      )}

      {entity === "feature" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Feature name" hint="E.g. Projector, Lab benches." error={errors.name}>
            <Input id="name" name="name" defaultValue={str(record, "name")} required className="h-9" />
          </Field>
          <Field htmlFor="category" label="Category" error={errors.category}>
            <Select
              id="category"
              name="category"
              defaultValue={str(record, "category") || "equipment"}
              options={FEATURE_CATEGORIES.map((category) => ({
                value: category,
                label: labelForValue(category),
              }))}
            />
          </Field>
        </div>
      )}

      {entity === "roomFeature" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="roomId" label="Room" error={errors.roomId}>
            <Select
              id="roomId"
              name="roomId"
              defaultValue={str(record, "room_id")}
              options={roomOptions}
              placeholder="Choose room"
            />
          </Field>
          <Field htmlFor="featureId" label="Feature" error={errors.featureId}>
            <Select
              id="featureId"
              name="featureId"
              defaultValue={str(record, "feature_id")}
              options={lookups.features.map((feature) => ({
                value: feature.id,
                label: feature.name,
              }))}
              placeholder="Choose feature"
            />
          </Field>
          <Field htmlFor="quantity" label="Quantity" hint="Optional." error={errors.quantity}>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={500}
              defaultValue={num(record, "quantity")}
              className="h-9"
            />
          </Field>
        </div>
      )}

      {entity === "availability" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="roomId" label="Room" error={errors.roomId}>
            <Select
              id="roomId"
              name="roomId"
              defaultValue={str(record, "room_id")}
              options={roomOptions}
              placeholder="Choose room"
            />
          </Field>
          <Field htmlFor="semesterId" label="Semester" error={errors.semesterId}>
            <Select
              id="semesterId"
              name="semesterId"
              defaultValue={str(record, "semester_id")}
              options={semesterOptions}
              placeholder="Choose semester"
            />
          </Field>
          <Field
            htmlFor="dayOfWeek"
            label="Day"
            hint="A room needs a window on a day before it can be booked then."
            error={errors.dayOfWeek}
          >
            <Select
              id="dayOfWeek"
              name="dayOfWeek"
              defaultValue={String(num(record, "day_of_week") || 1)}
              options={WEEKDAYS.map((day) => ({ value: String(day.value), label: day.label }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field htmlFor="opensAt" label="Opens" error={errors.opensAt}>
              <Input
                id="opensAt"
                name="opensAt"
                type="time"
                defaultValue={clock(record, "opens_at") || "08:00"}
                required
                className="h-9"
              />
            </Field>
            <Field htmlFor="closesAt" label="Closes" error={errors.closesAt}>
              <Input
                id="closesAt"
                name="closesAt"
                type="time"
                defaultValue={clock(record, "closes_at") || "18:00"}
                required
                className="h-9"
              />
            </Field>
          </div>
        </div>
      )}

      {entity === "booking" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="roomId" label="Room" error={errors.roomId}>
            <Select
              id="roomId"
              name="roomId"
              defaultValue={str(record, "room_id")}
              options={roomOptions}
              placeholder="Choose room"
            />
          </Field>
          <Field htmlFor="semesterId" label="Semester" error={errors.semesterId}>
            <Select
              id="semesterId"
              name="semesterId"
              defaultValue={str(record, "semester_id")}
              options={semesterOptions}
              placeholder="Choose semester"
            />
          </Field>
          <Field
            htmlFor="departmentId"
            label="Department"
            hint={lockedDepartmentId ? "You book for your own department." : "Optional for institution-wide bookings."}
            error={errors.departmentId}
          >
            <Select
              id="departmentId"
              name="departmentId"
              defaultValue={lockedDepartmentId ?? str(record, "department_id")}
              options={departmentOptions}
              placeholder={lockedDepartmentId ? undefined : "No department"}
            />
          </Field>
          <Field htmlFor="title" label="Purpose" error={errors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={str(record, "title")}
              placeholder="CPE 301 lecture"
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="date" label="Date" error={errors.date}>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={str(record, "date") || today || ""}
              required
              className="h-9"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field htmlFor="startTime" label="Starts" error={errors.startTime}>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={str(record, "startTime") || "09:00"}
                required
                className="h-9"
              />
            </Field>
            <Field htmlFor="endTime" label="Ends" error={errors.endTime}>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={str(record, "endTime") || "11:00"}
                required
                className="h-9"
              />
            </Field>
          </div>
          <Field htmlFor="expectedAttendees" label="Expected attendees" error={errors.expectedAttendees}>
            <Input
              id="expectedAttendees"
              name="expectedAttendees"
              type="number"
              min={1}
              max={5000}
              defaultValue={num(record, "expected_attendees") || ""}
              required
              className="h-9"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field htmlFor="purpose" label="Notes" hint="Optional." error={errors.purpose}>
              <Input id="purpose" name="purpose" defaultValue={str(record, "purpose")} className="h-9" />
            </Field>
          </div>
        </div>
      )}

      <SubmitButton pendingLabel={editing ? "Saving…" : "Creating…"}>
        {editing ? "Save changes" : `Add ${entity === "roomFeature" ? "equipment" : entity}`}
      </SubmitButton>
    </form>
  );
}
