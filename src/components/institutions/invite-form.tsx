"use client";

import { useActionState } from "react";
import { CopyField } from "@/components/shared/copy-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { IDLE_FORM_STATE, type FormState } from "@/lib/forms";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { INVITABLE_ROLES, type InvitableRole } from "@/types/database";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type InviteAction = (state: FormState, formData: FormData) => Promise<FormState>;

export function InviteForm({
  action,
  institutionId,
  defaultRole = "student",
  roleOptions = INVITABLE_ROLES,
  submitLabel = "Create invitation",
  compact = false,
}: {
  action: InviteAction;
  institutionId: string;
  defaultRole?: InvitableRole;
  roleOptions?: readonly InvitableRole[];
  submitLabel?: string;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState(action, IDLE_FORM_STATE);
  const errors = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="institutionId" value={institutionId} />

        <div className={compact ? "grid gap-3 sm:grid-cols-3" : "grid gap-4 sm:grid-cols-2"}>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor={`email-${institutionId}`} className="text-sm font-medium">
              Email address
            </label>
            <Input
              id={`email-${institutionId}`}
              name="email"
              type="email"
              required
              placeholder="colleague@institution.edu.ng"
              aria-invalid={Boolean(errors.email)}
              className="h-9"
            />
            {errors.email && (
              <p role="alert" className="text-xs text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`role-${institutionId}`} className="text-sm font-medium">
              Role
            </label>
            <select
              id={`role-${institutionId}`}
              name="role"
              defaultValue={defaultRole}
              className={selectClass}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`expires-${institutionId}`}
              className="text-sm font-medium"
            >
              Expires in (days)
            </label>
            <Input
              id={`expires-${institutionId}`}
              name="expiresInDays"
              type="number"
              min={1}
              max={60}
              defaultValue={14}
              className="h-9"
            />
            {errors.expiresInDays && (
              <p role="alert" className="text-xs text-destructive">
                {errors.expiresInDays}
              </p>
            )}
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

        <SubmitButton pendingLabel="Creating…">{submitLabel}</SubmitButton>
      </form>

      {state.status === "success" && (
        <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {state.message}
          </p>
          {state.inviteUrl && <CopyField value={state.inviteUrl} />}
          <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
            Single use, and the token is shown only now. If it is lost, revoke the
            invitation and create another.
          </p>
        </div>
      )}
    </div>
  );
}
