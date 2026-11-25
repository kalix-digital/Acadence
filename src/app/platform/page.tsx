import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, MailPlus, ShieldCheck, Users } from "lucide-react";
import { InstitutionStatusBadge } from "@/components/institutions/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { getPlatformSummary, listActivity } from "@/lib/institutions/data";

export const metadata: Metadata = { title: "Platform overview" };

const stats = [
  { key: "total", label: "Institutions", icon: Building2 },
  { key: "members", label: "Active members", icon: Users },
  { key: "pendingInvitations", label: "Pending invitations", icon: MailPlus },
  { key: "active", label: "Active institutions", icon: ShieldCheck },
] as const;

export default async function PlatformOverviewPage() {
  const summary = await getPlatformSummary();
  const activity = await listActivity(null, 8);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Platform administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Acadence platform
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-9 rounded-xl">
            <Link href="/platform/institutions">All institutions</Link>
          </Button>
          <Button asChild className="h-9 rounded-xl">
            <Link href="/platform/institutions/new">Provision institution</Link>
          </Button>
        </div>
      </div>

      <section aria-label="Platform indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {stat.label}
                </p>
                <Icon className="size-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {summary[stat.key]}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Institutions</CardTitle>
            <CardDescription>
              Every tenant on the platform, newest member counts included.
            </CardDescription>
            <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/platform/institutions">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {summary.institutions.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No institutions yet. Provision the first one to begin onboarding.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.institutions.slice(0, 6).map((institution) => (
                    <TableRow key={institution.id}>
                      <TableCell>
                        <Link
                          href={`/platform/institutions/${institution.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {institution.name}
                        </Link>
                        <span className="mt-0.5 block font-mono text-[0.7rem] text-muted-foreground">
                          {institution.slug}
                        </span>
                      </TableCell>
                      <TableCell>
                        <InstitutionStatusBadge status={institution.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {institution.memberCount}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(institution.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent platform activity</CardTitle>
            <CardDescription>
              Provisioning, membership and invitation events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            ) : (
              <ol className="space-y-3">
                {activity.map((event) => (
                  <li key={event.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm">{event.summary}</p>
                      <Badge variant="outline" className="shrink-0 text-[0.6rem]">
                        {event.action.split(".")[0]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
