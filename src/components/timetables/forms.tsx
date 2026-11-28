"use client";

import { useActionState, useState } from "react";
import {
  duplicateTimetableDraftAction,
  publishTimetableAction,
  saveTimetableDraftAction,
  saveTimetableEntryAction,
  submitChangeRequestAction,
} from "@/app/institution/timetables/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { WEEKDAYS, formatClock } from "@/lib/timetables/constants";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type RecordValues = Record<string, unknown> | null | undefined;

function str(record: RecordValues, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
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

/** Accepts either { id, label } or { value, label } option lists. */
export type Choice = { id?: string; value?: string; label: string };

function choiceId(choice: Choice) {
  return choice.id ?? choice.value ?? "";
}

function Options({ items }: { items: Choice[] }) {
  return (
    <>
      {items.map((item) => (
        <option key={choiceId(item)} value={choiceId(item)}>
          {item.label}
        </option>
      ))}
    </>
  );
}

function FormMessage({ state }: { state: { status: string; message?: string } }) {
  if (state.status === "error" && state.message) {
    return (
      <p
        role="alert"
        className="whitespace-pre-line rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
      >
        {state.message}
      </p>
    );
  }
  if (state.status === "success" && state.message) {
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------
export type DraftFormLookups = {
  semesters: Choice[];
  departments: Choice[];
  faculties: Choice[];
};

export function TimetableDraftForm({
  draft,
  lookups,
  defaultSemesterId,
}: {
  draft?: RecordValues;
  lookups: DraftFormLookups;
  defaultSemesterId?: string;
}) {
  const [state, formAction] = useActionState(saveTimetableDraftAction, IDLE_FORM_STATE);
  const errors = state.fieldErrors ?? {};
  const id = str(draft, "id");
  const initialScope = draft?.department_id
    ? "department"
    : draft?.faculty_id
      ? "faculty"
      : draft
        ? "institution"
        : "department";
  const [scope, setScope] = useState(initialScope);
  const initialScopeId = draft?.department_id
    ? str(draft, "department_id")
    : draft?.faculty_id
      ? str(draft, "faculty_id")
      : "";

  return (
    <form action={formAction} className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="title" label="Draft title" error={errors.title}>
          <Input
            id="title"
            name="title"
            defaultValue={str(draft, "title")}
            placeholder="CSC first semester"
            required
            className="h-9"
          />
        </Field>

        <Field htmlFor="semesterId" label="Semester" error={errors.semesterId}>
          <select
            id="semesterId"
            name="semesterId"
            defaultValue={str(draft, "semester_id") || defaultSemesterId || ""}
            className={selectClass}
            required
          >
            <option value="">Choose a semester</option>
            <Options items={lookups.semesters} />
          </select>
        </Field>

        <Field
          htmlFor="scope"
          label="Draft scope"
          hint="Publishing replaces the entries inside this scope and keeps the rest of the live version."
          error={errors.scope}
        >
          <select
            id="scope"
            name="scope"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className={selectClass}
          >
            <option value="department">One department</option>
            <option value="faculty">One faculty</option>
            <option value="institution">Whole institution</option>
          </select>
        </Field>

        {scope === "department" && (
          <Field htmlFor="scopeId" label="Department" error={errors.scopeId}>
            <select
              id="scopeId"
              name="scopeId"
              defaultValue={initialScopeId}
              className={selectClass}
              required
            >
              <option value="">Choose a department</option>
              <Options items={lookups.departments} />
            </select>
          </Field>
        )}

        {scope === "faculty" && (
          <Field htmlFor="scopeId" label="Faculty" error={errors.scopeId}>
            <select
              id="scopeId"
              name="scopeId"
              defaultValue={initialScopeId}
              className={selectClass}
              required
            >
              <option value="">Choose a faculty</option>
              <Options items={lookups.faculties} />
            </select>
          </Field>
        )}
      </div>

      <SubmitButton>{id ? "Save draft" : "Create draft"}</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
export type EntryFormLookups = {
  offerings: Choice[];
  lecturers: Choice[];
  rooms: Choice[];
  groups: Choice[];
  departments: Choice[];
};

export function TimetableEntryForm({
  draftId,
  entry,
  lookups,
  defaultDay,
  defaultStart,
}: {
  draftId: string;
  entry?: RecordValues;
  lookups: EntryFormLookups;
  defaultDay?: number;
  defaultStart?: string;
}) {
  const [state, formAction] = useActionState(saveTimetableEntryAction, IDLE_FORM_STATE);
  const errors = state.fieldErrors ?? {};
  const id = str(entry, "id");
  const [fixed, setFixed] = useState(Boolean(entry?.is_fixed));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="draftId" value={draftId} />
      {id && <input type="hidden" name="id" value={id} />}
      <FormMessage state={state} />

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="isFixed"
          value="1"
          checked={fixed}
          onChange={(event) => setFixed(event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span>
          Fixed entry — a meeting or briefing that has no course offering. Its notes become the
          label on the grid.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        {!fixed && (
          <Field htmlFor="offeringId" label="Course offering" error={errors.offeringId}>
            <select
              id="offeringId"
              name="offeringId"
              defaultValue={str(entry, "offering_id")}
              className={selectClass}
            >
              <option value="">Choose an offering</option>
              <Options items={lookups.offerings} />
            </select>
          </Field>
        )}

        <Field
          htmlFor="departmentId"
          label="Department"
          hint="Taken from the offering; required for fixed entries in a faculty draft."
          error={errors.departmentId}
        >
          <select
            id="departmentId"
            name="departmentId"
            defaultValue={str(entry, "department_id")}
            className={selectClass}
          >
            <option value="">Institution-wide</option>
            <Options items={lookups.departments} />
          </select>
        </Field>

        <Field htmlFor="lecturerId" label="Lecturer" error={errors.lecturerId}>
          <select
            id="lecturerId"
            name="lecturerId"
            defaultValue={str(entry, "lecturer_id")}
            className={selectClass}
          >
            <option value="">No lecturer</option>
            <Options items={lookups.lecturers} />
          </select>
        </Field>

        <Field htmlFor="roomId" label="Room" error={errors.roomId}>
          <select
            id="roomId"
            name="roomId"
            defaultValue={str(entry, "room_id")}
            className={selectClass}
          >
            <option value="">No room</option>
            <Options items={lookups.rooms} />
          </select>
        </Field>

        <Field htmlFor="groupId" label="Student group" error={errors.groupId}>
          <select
            id="groupId"
            name="groupId"
            defaultValue={str(entry, "group_id")}
            className={selectClass}
          >
            <option value="">No group</option>
            <Options items={lookups.groups} />
          </select>
        </Field>

        <Field htmlFor="dayOfWeek" label="Day" error={errors.dayOfWeek}>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            defaultValue={str(entry, "day_of_week") || String(defaultDay ?? 1)}
            className={selectClass}
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="startsAt" label="Starts" error={errors.startsAt}>
          <Input
            id="startsAt"
            name="startsAt"
            type="time"
            step={300}
            defaultValue={formatClock(str(entry, "starts_at")) || defaultStart || "09:00"}
            className="h-9"
            required
          />
        </Field>

        <Field htmlFor="endsAt" label="Ends" error={errors.endsAt}>
          <Input
            id="endsAt"
            name="endsAt"
            type="time"
            step={300}
            defaultValue={formatClock(str(entry, "ends_at")) || "11:00"}
            className="h-9"
            required
          />
        </Field>

        <Field htmlFor="notes" label="Notes" error={errors.notes}>
          <Input
            id="notes"
            name="notes"
            defaultValue={str(entry, "notes")}
            maxLength={300}
            className="h-9"
            placeholder={fixed ? "Faculty board" : "Optional"}
          />
        </Field>
      </div>

      <SubmitButton>{id ? "Save entry" : "Add entry"}</SubmitButton>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Publish and duplicate
// ---------------------------------------------------------------------------
export function PublishTimetableForm({ draftId }: { draftId: string }) {
  const [state, formAction] = useActionState(publishTimetableAction, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="draftId" value={draftId} />
      <FormMessage state={state} />
      <Field
        htmlFor="summary"
        label="Change summary"
        hint="Stored on the version so history explains what changed."
      >
        <Input
          id="summary"
          name="summary"
          maxLength={300}
          placeholder="Published after the laboratory room change"
          className="h-9"
        />
      </Field>
      <SubmitButton>Publish version</SubmitButton>
      <p className="text-xs text-muted-foreground">
        Publishing validates every hard rule first. On success the current live version becomes
        superseded and is kept unchanged in history.
      </p>
    </form>
  );
}

export function DuplicateTimetableDraftForm({
  draftId,
  semesters,
}: {
  draftId: string;
  semesters: Choice[];
}) {
  const [state, formAction] = useActionState(duplicateTimetableDraftAction, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="draftId" value={draftId} />
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field htmlFor="copySemester" label="Copy into">
          <select id="copySemester" name="semesterId" className={selectClass} required>
            <option value="">Choose a semester</option>
            <Options items={semesters} />
          </select>
        </Field>
        <Field htmlFor="copyTitle" label="New title" hint="Optional; the default adds (copy).">
          <Input id="copyTitle" name="title" maxLength={120} className="h-9" />
        </Field>
      </div>
      <SubmitButton>Duplicate draft</SubmitButton>
      <p className="text-xs text-muted-foreground">
        Offerings are re-matched by course code, lecturers by staff number, rooms and groups by
        code. Rows that cannot be matched are skipped and reported.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Change request
// ---------------------------------------------------------------------------
export function ChangeRequestForm({
  entryId,
  day,
  startsAt,
  endsAt,
  rooms,
  locked,
}: {
  entryId: string;
  day: number;
  startsAt: string;
  endsAt: string;
  rooms: Choice[];
  locked?: boolean;
}) {
  if (locked) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        A request for this entry is already waiting for review.
      </p>
    );
  }

  return (
    <form action={submitChangeRequestAction} className="space-y-3">
      <input type="hidden" name="entryId" value={entryId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field htmlFor={`day-${entryId}`} label="Proposed day">
          <select
            id={`day-${entryId}`}
            name="dayOfWeek"
            defaultValue={String(day)}
            className={selectClass}
          >
            {WEEKDAYS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={`room-${entryId}`} label="Proposed room">
          <select id={`room-${entryId}`} name="roomId" className={selectClass}>
            <option value="">Keep the current room</option>
            <Options items={rooms} />
          </select>
        </Field>
        <Field htmlFor={`start-${entryId}`} label="Starts">
          <Input
            id={`start-${entryId}`}
            name="startsAt"
            type="time"
            step={300}
            defaultValue={formatClock(startsAt)}
            className="h-9"
            required
          />
        </Field>
        <Field htmlFor={`end-${entryId}`} label="Ends">
          <Input
            id={`end-${entryId}`}
            name="endsAt"
            type="time"
            step={300}
            defaultValue={formatClock(endsAt)}
            className="h-9"
            required
          />
        </Field>
      </div>
      <Field htmlFor={`reason-${entryId}`} label="Reason">
        <Input
          id={`reason-${entryId}`}
          name="reason"
          maxLength={300}
          placeholder="Monday clashes with a laboratory session"
          className="h-9"
          required
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Approval publishes a new version of the timetable; the current version stays in
        history.
      </p>
      <SubmitButton>Submit request</SubmitButton>
    </form>
  );
}
