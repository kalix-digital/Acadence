import type { ReactNode } from "react";
import { IconRail } from "@/components/layout/icon-rail";
import { SidebarNav } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Capability } from "@/lib/auth/capabilities";

export type ShellIdentity = {
  user: { name: string; email: string | null };
  institutionName: string;
  roleLabel: string;
  capabilities: Capability[];
};

export function DashboardShell({
  children,
  identity,
}: {
  children: ReactNode;
  identity: ShellIdentity;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-svh bg-background">
        <IconRail identity={identity} />
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <div className="sticky top-0 h-svh">
            <SidebarNav
              capabilities={identity.capabilities}
              roleLabel={identity.roleLabel}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar identity={identity} />
          <main className="dashboard-surface flex-1 px-4 py-6 lg:px-6">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
