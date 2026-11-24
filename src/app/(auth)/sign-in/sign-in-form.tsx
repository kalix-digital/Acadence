"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signInAction, type AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = { status: "idle" };

export function SignInForm({
  next,
  configured,
}: {
  next: string;
  configured: boolean;
}) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

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

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10 rounded-xl"
        />
      </div>

      {state.status === "error" && (
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
        Sign in
      </Button>

      {!configured && (
        <p className="rounded-xl border border-chart-5/30 bg-chart-5/10 px-3 py-2 text-xs text-chart-5">
          Supabase is not configured. Add your project URL and anon key to
          <span className="font-mono"> .env.local</span> to enable sign-in.
        </p>
      )}
    </form>
  );
}
