import type { Metadata } from "next";
import {
  BookOpenCheck,
  Building2,
  GraduationCap,
  Users,
} from "lucide-react";
import { ConflictPanel } from "@/components/dashboard/conflict-panel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { RoomUtilisation } from "@/components/dashboard/room-utilisation";
import { StatCard } from "@/components/dashboard/stat-card";
import { TimetableActivityChart } from "@/components/dashboard/timetable-activity-chart";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { WorkloadPanel } from "@/components/dashboard/workload-panel";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import { requireMember } from "@/lib/auth/require";
import { overviewStats } from "@/data/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

const statIcons = [GraduationCap, Users, BookOpenCheck, Building2];

export default async function InstitutionDashboardPage() {
  const { user, role, institution } = await requireMember();
  const institutionName = institution?.name ?? "Institution";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {institutionName} · {ROLE_LABELS[role]}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Institutional overview</h1>
        </div>
        <Badge variant="outline" className="gap-1.5 border-chart-5/30 text-chart-5">
          <span className="size-1.5 rounded-full bg-chart-5" />
          Phase 2 · authenticated · sample metrics
        </Badge>
      </div>

      <section
        aria-label="Key academic indicators"
        className="grid gap-4 xl:grid-cols-5"
      >
        <div className="xl:col-span-2">
          <WelcomeBanner name={user.name} institutionName={institutionName} />
        </div>
        {overviewStats.map((stat, index) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            note={stat.note}
            trend={stat.trend}
            tone={stat.tone}
            icon={statIcons[index]}
          />
        ))}
      </section>

      <section aria-label="Scheduling analytics" className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TimetableActivityChart />
        </div>
        <RoomUtilisation />
      </section>

      <section aria-label="Operational detail" className="grid gap-4 xl:grid-cols-3">
        <ConflictPanel />
        <UpcomingEvents />
        <WorkloadPanel />
      </section>

      <RecentActivity />
    </div>
  );
}
