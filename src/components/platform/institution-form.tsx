"use client";

import { useActionState } from "react";
import { createInstitutionAction } from "@/app/platform/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { IDLE_FORM_STATE } from "@/lib/forms";
import { INSTITUTION_TYPES } from "@/types/database";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

export function InstitutionForm() {
  const [state, formAction] = useActionState(
    createInstitutionAction,
    IDLE_FORM_STATE,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="name" className="text-sm font-medium">
            Institution name
          </label>
          <Input
            id="name"
            name="name"
            required
            placeholder="University of Lagos"
            aria-invalid={Boolean(errors.name)}
            className="h-9"
          />
          <FieldError message={errors.name} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug
          </label>
          <Input
            id="slug"
            name="slug"
            placeholder="university-of-lagos"
            aria-invalid={Boolean(errors.slug)}
            className="h-9 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Used in links and support references. Leave blank to derive it from
            the name.
          </p>
          <FieldError message={errors.slug} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue="university"
            className={selectClass}
          >
            {INSTITUTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <FieldError message={errors.type} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue="Africa/Lagos"
            aria-invalid={Boolean(errors.timezone)}
            className="h-9"
          />
          <FieldError message={errors.timezone} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="logoUrl" className="text-sm font-medium">
            Logo URL <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            placeholder="https://…"
            aria-invalid={Boolean(errors.logoUrl)}
            className="h-9"
          />
          <FieldError message={errors.logoUrl} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="brandPrimary" className="text-sm font-medium">
            Brand colour <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="brandPrimary"
            name="brandPrimary"
            placeholder="#2563eb"
            aria-invalid={Boolean(errors.brandPrimary)}
            className="h-9 font-mono text-sm"
          />
          <FieldError message={errors.brandPrimary} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="brandAccent" className="text-sm font-medium">
            Accent colour <span className="text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="brandAccent"
            name="brandAccent"
            placeholder="#22d3ee"
            aria-invalid={Boolean(errors.brandAccent)}
            className="h-9 font-mono text-sm"
          />
          <FieldError message={errors.brandAccent} />
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Provisioning…">
          Provision institution
        </SubmitButton>
        <p className="text-xs text-muted-foreground">
          New institutions start as <span className="font-medium">pending</span>{" "}
          until you activate them.
        </p>
      </div>
    </form>
  );
}
