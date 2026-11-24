import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { APP_NAME, APP_DESCRIPTION } from "@/config/site";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1a33] via-[#0a1526] to-[#060c19] p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/4 size-80 rounded-full bg-primary/20 blur-3xl"
        />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <GraduationCap className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </span>
        </Link>

        <div className="relative max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">
            Academic operations, finally in one place.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {APP_DESCRIPTION} Timetables, rooms, workloads and analytics share one
            academic record, scoped to your institution.
          </p>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Access is by institutional invitation. Contact your institution
          administrator if you need an account.
        </p>
      </aside>

      <div className="dashboard-surface flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to {APP_NAME}
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
