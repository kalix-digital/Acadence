import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarRange,
  GraduationCap,
  Landmark,
  Layers,
  Network,
  ScrollText,
} from "lucide-react";
import { AcademicFlash } from "@/components/academics/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACADEMIC_ENTITIES, type AcademicEntity } from "@/lib/academics/constants";
import { academicSummary } from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";
import { listActivity } from "@/lib/institutions/data";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Academic administration" };

const SECTIONS: {
  entity: AcademicEntity;
  icon: typeof Building2;
  description: string;
}[] = [
  {
    entity: "campus",
    icon: Building2,
    description: "Optional sites a faculty can belong to.",
  },
  {
    entity: "faculty",
    icon: Landmark,
    description: "Top level of the academic hierarchy.",
  },
  {
    entity: "department",
    icon: Network,
    description: "Owns programmes and courses.",
  },
  {
    entity: "session",
    icon: CalendarRange,
    description: "Academic years and their semesters.",
  },
  {
    entity: "programme",
    icon: GraduationCap,
    description: "Degrees, diplomas and certificates.",
  },
  {
    entity: "course",
    icon: BookOpen,
    description: "Courses and the programme curriculum.",
  },
];

export default async function AcademicsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  const context = await requireCapability("manage_academics");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const [summary, activity] = await Promise.all([
    academicSummary(institutionId),
    listActivity(institutionId, 12),
  ]);
  const academicActivity = activity.filter((entry) =>
    entry.action.startsWith("academic."),
  );

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/institution"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Academic administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The structure every timetable, room booking and attendance record will
          point at. Records are archived, never deleted.
        </p>
      </div>

      <AcademicFlash updated={params.updated} error={params.error} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Campuses", value: summary.campuses },
          { label: "Faculties", value: summary.faculties },
          { label: "Departments", value: summary.departments },
          { label: "Programmes", value: summary.programmes },
          { label: "Courses", value: summary.courses },
          { label: "Sessions", value: summary.sessions },
          { label: "Semesters", value: summary.semesters },
          { label: "Archived courses", value: summary.archivedCourses },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/70 bg-card/40 px-3.5 py-3"
          >
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-4 text-primary" /> The hierarchy
          </CardTitle>
          <CardDescription>
            Each level constrains the one below it, and every record carries its
            institution. A faculty is optional on a campus; everything else has a
            required parent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {[
              "Institution",
              "Campus (optional)",
              "Faculty",
              "Department",
              "Programme / Course",
              "Curriculum link",
            ].map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                {index > 0 && <ArrowRight className="size-3 opacity-50" />}
                <span className="rounded-lg border border-border/70 px-2 py-1">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const config = ACADEMIC_ENTITIES[section.entity];
          return (
            <Link
              key={section.entity}
              href={config.path}
              className="group rounded-xl border border-border/70 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card"
            >
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <span className="text-sm font-medium">{config.label}</span>
                <ArrowRight className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{section.description}</p>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="size-4 text-primary" /> Recent changes
          </CardTitle>
          <CardDescription>
            Every create, edit, archive and restore is written to the institution
            activity trail by the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {academicActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No academic changes yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {academicActivity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="text-sm">{entry.summary}</span>
                  <span className="text-[0.7rem] text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
