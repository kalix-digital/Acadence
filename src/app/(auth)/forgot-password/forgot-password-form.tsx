"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  requestPasswordResetAction,
  type AuthFormState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = { status: "idle" };

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@institution.edu.ng"
          className="h-10 rounded-xl"
        />
      </div>

      {state.message && (
        <p
          role="status"
          className={
            state.status === "success"
              ? "rounded-xl border border-chart-4/30 bg-chart-4/10 px-3 py-2 text-xs text-chart-4"
              : "rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          }
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
        Send reset link
      </Button>
    </form>
  );
}
