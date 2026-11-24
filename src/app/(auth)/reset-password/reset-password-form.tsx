"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { updatePasswordAction, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = { status: "idle" };

export function ResetPasswordForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="h-10 rounded-xl"
        />
        <p className="text-[0.7rem] text-muted-foreground">
          At least 10 characters. A passphrase is better than a short password.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="h-10 rounded-xl"
        />
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending || !configured}
        className="h-10 w-full rounded-xl"
      >
        {pending && <Loader2 className="animate-spin" />}
        Update password
      </Button>
    </form>
  );
}
