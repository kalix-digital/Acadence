import Link from "next/link";
import { ArrowRight, CalendarCheck2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTIVE_CONTEXT } from "@/config/site";
import { bannerStats } from "@/data/dashboard";

export function WelcomeBanner() {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#1d4ed8] p-5 text-primary-foreground shadow-xl shadow-primary/20 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-48 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 right-14 size-40 rounded-full bg-cyan-300/20 blur-2xl"
      />

      <div className="relative flex h-full flex-col">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em]">
          <Sparkles className="size-3" />
          {ACTIVE_CONTEXT.semester}
        </span>

        <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
          Welcome back, {ACTIVE_CONTEXT.user.name.split(" ").slice(-1)}
        </h1>
        <p className="mt-1 max-w-sm text-sm text-primary-foreground/80">
          {ACTIVE_CONTEXT.institution} · {ACTIVE_CONTEXT.campus}. Semester scheduling is
          68% complete with 7 conflicts awaiting review.
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
          {bannerStats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-[0.65rem] uppercase tracking-wide text-primary-foreground/70">
                {stat.label}
              </dt>
              <dd className="mt-0.5 text-lg font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-white text-primary hover:bg-white/90"
          >
            <Link href="#conflicts">
              Review conflicts
              <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="rounded-xl text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          >
            <Link href="#timetable-activity">
              <CalendarCheck2 />
              Timetable activity
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
