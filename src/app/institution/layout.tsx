import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { requireMember } from "@/lib/auth/require";

// Session- and membership-bound: never prerender a tenant shell.
export const dynamic = "force-dynamic";

export default async function InstitutionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireMember();

  const institutions = context.memberships
    .filter((membership) => membership.institutionId)
    .map((membership) => ({
      id: membership.institutionId as string,
      name: membership.institutionName ?? "Institution",
    }))
    .filter(
      (institution, index, all) =>
        all.findIndex((other) => other.id === institution.id) === index,
    );

  return (
    <DashboardShell
      identity={{
        user: { name: context.user.name, email: context.user.email },
        institutionName: context.institution?.name ?? "Institution",
        roleLabel: ROLE_LABELS[context.role],
        capabilities: context.capabilities,
        institutions,
        activeInstitutionId: context.institution?.id ?? null,
      }}
    >
      {children}
    </DashboardShell>
  );
}
