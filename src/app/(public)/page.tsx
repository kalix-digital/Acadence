import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/site";

const highlights = [
  {
    icon: CalendarRange,
    title: "Constraint-checked timetables",
    body: "Draft, validate and publish semester timetables with lecturer, room and group conflicts caught before students see them.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated institutions",
    body: "Every record belongs to one institution, enforced by database row-level security as well as server checks.",
  },
  {
    icon: Sparkles,
    title: "Academic intelligence",
    body: "Room utilisation, workload balance and institution analytics drawn from the same academic record.",
  },
];

export default function LandingPage() {
  return (
    <main className="dashboard-surface relative min-h-svh overflow-hidden px-6 py-10 sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <GraduationCap className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
          </span>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </header>

        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="mb-4 border-primary/40 text-primary">
              Academic operations platform
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Timetables your institution can trust.
            </h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              {APP_NAME} brings academic administration, scheduling, room allocation
              and workload management into one multi-institution platform — with
              conflicts caught before publication.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-xl">
                <Link href="/sign-in">
                  Sign in to your institution
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="rounded-xl">
                <Link href="#capabilities">How it works</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Accounts are provisioned through institutional invitations.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-2xl shadow-primary/10 backdrop-blur">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Semester snapshot
            </p>
            <p className="mt-2 text-lg font-semibold">
              First semester 2026/2027
            </p>
            <div className="mt-5 space-y-3">
              {[
                ["Published timetables", "42"],
                ["Unresolved conflicts", "7"],
                ["Room utilisation", "81%"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold tabular-nums">{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[0.7rem] text-muted-foreground">
              Illustrative figures from the dashboard shell; live metrics arrive in
              Phase 15.
            </p>
          </div>
        </section>

        <section id="capabilities" className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/70 bg-card/60 p-5"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-medium">{item.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </section>

        <footer className="border-t border-border/60 pt-6 text-xs text-muted-foreground">
          {APP_NAME} · Multi-institution academic scheduling and administration.
        </footer>
      </div>
    </main>
  );
}
