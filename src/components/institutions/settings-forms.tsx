"use client";

import { useActionState } from "react";
import {
  updateInstitutionProfileAction,
  updateInstitutionSettingsAction,
} from "@/app/institution/settings/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms";
import { timeInputValue } from "@/lib/format";
import { INSTITUTION_TYPES } from "@/types/database";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

function Feedback({ state }: { state: FormState }) {
  if (!state.message) return null;
  const error = state.status === "error";
  return (
    <p
      role={error ? "alert" : "status"}
      className={
        error
          ? "rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
      }
    >
      {state.message}
    </p>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function InstitutionProfileForm({
  institution,
}: {
  institution: {
    name: string;
    slug: string;
    type: string;
    timezone: string;
    logo_url: string | null;
    brand_primary: string | null;
    brand_accent: string | null;
  };
}) {
  const [state, formAction] = useActionState(
    updateInstitutionProfileAction,
    IDLE_FORM_STATE,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="name" className="text-sm font-medium">
            Institution name
          </label>
          <Input
            id="name"
            name="name"
            defaultValue={institution.name}
            required
            aria-invalid={Boolean(errors.name)}
            className="h-9"
          />
          <ErrorText message={errors.name} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug
          </label>
          <Input
            id="slug"
            value={institution.slug}
            readOnly
            disabled
            className="h-9 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Platform-controlled; request a change from Acadence support.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={institution.type}
            className={selectClass}
          >
            {INSTITUTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={institution.timezone}
            aria-invalid={Boolean(errors.timezone)}
            className="h-9"
          />
          <ErrorText message={errors.timezone} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="logoUrl" className="text-sm font-medium">
            Logo URL
          </label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={institution.logo_url ?? ""}
            placeholder="https://…"
            aria-invalid={Boolean(errors.logoUrl)}
            className="h-9"
          />
          <ErrorText message={errors.logoUrl} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="brandPrimary" className="text-sm font-medium">
            Brand colour
          </label>
          <Input
            id="brandPrimary"
            name="brandPrimary"
            defaultValue={institution.brand_primary ?? ""}
            placeholder="#2563eb"
            aria-invalid={Boolean(errors.brandPrimary)}
            className="h-9 font-mono text-sm"
          />
          <ErrorText message={errors.brandPrimary} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="brandAccent" className="text-sm font-medium">
            Accent colour
          </label>
          <Input
            id="brandAccent"
            name="brandAccent"
            defaultValue={institution.brand_accent ?? ""}
            placeholder="#22d3ee"
            aria-invalid={Boolean(errors.brandAccent)}
            className="h-9 font-mono text-sm"
          />
          <ErrorText message={errors.brandAccent} />
        </div>
      </div>

      <Feedback state={state} />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function InstitutionSettingsForm({
  institutionId,
  settings,
}: {
  institutionId: string;
  settings: {
    working_days: number[];
    slot_minutes: number;
    day_starts_at: string;
    day_ends_at: string;
    default_max_contact_hours: number;
    allow_teaching_in_exams: boolean;
  } | null;
}) {
  const [state, formAction] = useActionState(
    updateInstitutionSettingsAction,
    IDLE_FORM_STATE,
  );
  const errors = state.fieldErrors ?? {};
  const workingDays = new Set(settings?.working_days ?? [1, 2, 3, 4, 5]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="institutionId" value={institutionId} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Working days</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label
              key={day.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs has-checked:border-primary/50 has-checked:bg-primary/10"
            >
              <input
                type="checkbox"
                name="workingDays"
                value={day.value}
                defaultChecked={workingDays.has(day.value)}
                className="size-3.5 accent-[var(--primary)]"
              />
              {day.label}
            </label>
          ))}
        </div>
        <ErrorText message={errors.workingDays} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="slotMinutes" className="text-sm font-medium">
            Slot length (minutes)
          </label>
          <Input
            id="slotMinutes"
            name="slotMinutes"
            type="number"
            min={30}
            max={180}
            step={15}
            defaultValue={settings?.slot_minutes ?? 60}
            aria-invalid={Boolean(errors.slotMinutes)}
            className="h-9"
          />
          <ErrorText message={errors.slotMinutes} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="maxContactHours" className="text-sm font-medium">
            Weekly contact-hour limit
          </label>
          <Input
            id="maxContactHours"
            name="maxContactHours"
            type="number"
            min={1}
            max={60}
            defaultValue={settings?.default_max_contact_hours ?? 20}
            aria-invalid={Boolean(errors.maxContactHours)}
            className="h-9"
          />
          <ErrorText message={errors.maxContactHours} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dayStartsAt" className="text-sm font-medium">
            Teaching day starts
          </label>
          <Input
            id="dayStartsAt"
            name="dayStartsAt"
            type="time"
            defaultValue={timeInputValue(settings?.day_starts_at) || "08:00"}
            aria-invalid={Boolean(errors.dayStartsAt)}
            className="h-9"
          />
          <ErrorText message={errors.dayStartsAt} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dayEndsAt" className="text-sm font-medium">
            Teaching day ends
          </label>
          <Input
            id="dayEndsAt"
            name="dayEndsAt"
            type="time"
            defaultValue={timeInputValue(settings?.day_ends_at) || "18:00"}
            aria-invalid={Boolean(errors.dayEndsAt)}
            className="h-9"
          />
          <ErrorText message={errors.dayEndsAt} />
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-border p-3 text-sm">
        <input
          type="checkbox"
          name="allowTeachingInExams"
          defaultChecked={settings?.allow_teaching_in_exams ?? false}
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span>
          Allow teaching during examination periods
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Off by default: exam periods block new teaching slots.
          </span>
        </span>
      </label>

      <Feedback state={state} />
      <SubmitButton pendingLabel="Saving…">Save academic defaults</SubmitButton>
    </form>
  );
}
