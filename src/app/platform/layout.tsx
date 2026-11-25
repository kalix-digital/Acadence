import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { requirePlatformAdmin } from "@/lib/auth/require";

// Session- and role-bound: never prerender platform administration.
export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requirePlatformAdmin();

  return (
    <DashboardShell
      identity={{
        user: { name: context.user.name, email: context.user.email },
        institutionName: "Acadence platform",
        roleLabel: context.role ? ROLE_LABELS[context.role] : "Platform",
        capabilities: context.capabilities,
        variant: "platform",
        homeHref: "/platform",
      }}
    >
      {children}
    </DashboardShell>
  );
}
