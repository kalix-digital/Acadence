import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Mail, ShieldAlert } from "lucide-react";
import {
  AcceptInvitationForm,
  CreateAccountForm,
} from "@/components/invite/accept-forms";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/site";
import { isSupabaseConfigured } from "@/config/env";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import type { InvitationPreview } from "@/types/database";

export const metadata: Metadata = { title: "Accept invitation" };

// The token is checked against the database on every request.
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="dashboard-surface flex min-h-svh flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <GraduationCap className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 shadow-2xl shadow-primary/5">
        {children}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Access is by institutional invitation only.
      </p>
    </main>
  );
}

function Invalid({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <span className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/25">
        <ShieldAlert className="size-5" />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      <Button asChild variant="outline" className="mt-6 h-9 rounded-xl">
        <Link href="/sign-in">Go to sign in</Link>
      </Button>
    </Shell>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!isSupabaseConfigured) {
    return (
      <Invalid
        title="Invitations are not available yet"
        message="Supabase is not configured for this environment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app."
      />
    );
  }

  const supabase = await createClient();
  const [{ data: previewRows }, { data: auth }] = await Promise.all([
    supabase.rpc("invitation_preview", { p_token: token }),
    supabase.auth.getUser(),
  ]);

  const invitation = (previewRows?.[0] ?? null) as InvitationPreview | null;
  const user = auth.user;

  if (!invitation) {
    return (
      <Invalid
        title="This invitation link is not valid"
        message="Check that you copied the whole link from your invitation email, or ask your institution administrator for a new one."
      />
    );
  }

  if (invitation.state !== "pending") {
    const reason =
      invitation.state === "accepted"
        ? "This invitation has already been accepted. Sign in to open your institution workspace."
        : invitation.state === "revoked"
          ? "This invitation was revoked by the institution. Ask your administrator for a new one."
          : "This invitation has expired. Ask your institution administrator to send a new one.";

    return (
      <Invalid
        title={
          invitation.state === "accepted"
            ? "Invitation already used"
            : "Invitation no longer active"
        }
        message={reason}
      />
    );
  }

  const roleLabel = ROLE_LABELS[invitation.role];
  const signInHref = `/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`;
  const signedInEmail = user?.email?.toLowerCase() ?? null;
  const emailMatches = signedInEmail === invitation.email.toLowerCase();

  return (
    <Shell>
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {invitation.institution_name}
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">
        You have been invited as {roleLabel}
      </h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Mail className="size-3.5" /> {invitation.email}
      </p>

      <div className="mt-6">
        {!user && (
          <>
            <CreateAccountForm token={token} email={invitation.email} />
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button asChild variant="outline" className="h-10 w-full rounded-xl">
              <Link href={signInHref}>I already have an account</Link>
            </Button>
          </>
        )}

        {user && emailMatches && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Signed in as <span className="text-foreground">{user.email}</span>.
              Accepting adds {invitation.institution_name} to your account.
            </p>
            <AcceptInvitationForm token={token} />
            <p className="mt-4 text-[0.7rem] leading-relaxed text-muted-foreground">
              Your role is set by the institution. An administrator can change it
              later.
            </p>
          </>
        )}

        {user && !emailMatches && (
          <>
            <p
              role="alert"
              className="rounded-xl border border-chart-5/30 bg-chart-5/10 px-3 py-2 text-xs text-chart-5"
            >
              You are signed in as {user.email}, but this invitation was issued
              to {invitation.email}. Sign out and sign in with the invited
              address.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SignOutButton className="h-9 rounded-xl" />
              <Button asChild variant="ghost" className="h-9 rounded-xl">
                <Link href={signInHref}>Sign in with another account</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
