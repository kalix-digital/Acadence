import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Mail, ShieldAlert } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { requireUser } from "@/lib/auth/require";

export const metadata: Metadata = { title: "No institution access" };
export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const context = await requireUser();

  if (context.membership) {
    redirect("/institution");
  }

  return (
    <main className="dashboard-surface flex min-h-svh items-center justify-center px-5 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border/70 bg-card/80 p-7 shadow-2xl shadow-primary/5">
        <span className="grid size-11 place-items-center rounded-xl bg-chart-5/12 text-chart-5 ring-1 ring-chart-5/25">
          <ShieldAlert className="size-5" />
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          No institution yet
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You are signed in as{" "}
          <span className="font-medium text-foreground">{context.user.email}</span>,
          but this account has no active membership. Acadence accounts are created by
          an institution administrator, so nothing is visible until one exists.
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Ask for an invitation</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Send your exact sign-in address to your faculty or institution
                administrator and ask them to invite you with the right role.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
            <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Already invited?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Open the invitation link from your email. A pending invitation
                becomes an active membership only after you accept it.
              </p>
            </div>
          </div>
        </div>

        {context.memberships.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            Memberships found:{" "}
            {context.memberships
              .map((membership) => ROLE_LABELS[membership.role])
              .join(", ")}
            . Ask an administrator to reactivate one.
          </p>
        )}

        <div className="mt-7 flex flex-wrap gap-2">
          <SignOutButton className="h-9 rounded-xl" />
          <Button asChild variant="ghost" className="h-9 rounded-xl">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
