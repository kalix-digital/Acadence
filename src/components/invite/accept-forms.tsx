"use client";

import { useActionState } from "react";
import {
  acceptInvitationAction,
  createAccountAndAcceptAction,
} from "@/app/invite/[token]/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { IDLE_FORM_STATE } from "@/lib/forms";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

function Feedback({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message?: string;
}) {
  if (!message) return null;
  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={
        status === "error"
          ? "rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
      }
    >
      {message}
    </p>
  );
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(
    acceptInvitationAction,
    IDLE_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Feedback status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Joining…" className="h-10 w-full rounded-xl">
        Accept invitation
      </SubmitButton>
    </form>
  );
}

export function CreateAccountForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, formAction] = useActionState(
    createAccountAndAcceptAction,
    IDLE_FORM_STATE,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-1.5">
        <label htmlFor="invited-email" className="text-sm font-medium">
          Email address
        </label>
        <Input id="invited-email" value={email} readOnly disabled className="h-10 rounded-xl" />
        <p className="text-xs text-muted-foreground">
          Your account is created for the address the invitation was sent to.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium">
          Full name
        </label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          placeholder="Ada Okafor"
          aria-invalid={Boolean(errors.fullName)}
          className="h-10 rounded-xl"
        />
        <FieldError message={errors.fullName} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Choose a password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          aria-invalid={Boolean(errors.password)}
          className="h-10 rounded-xl"
        />
        <p className="text-xs text-muted-foreground">At least 10 characters.</p>
        <FieldError message={errors.password} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
          className="h-10 rounded-xl"
        />
        <FieldError message={errors.confirmPassword} />
      </div>

      <Feedback status={state.status} message={state.message} />

      <SubmitButton pendingLabel="Creating account…" className="h-10 w-full rounded-xl">
        Create account and join
      </SubmitButton>
    </form>
  );
}
