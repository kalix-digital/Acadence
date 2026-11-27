import type { Metadata } from "next";
import { AcademicForm } from "@/components/academics/forms";
import { AcademicsBackLink, AcademicsNav } from "@/components/academics/shell";
import {
  AcademicFlash,
  AcademicPagination,
  AcademicTable,
  AcademicToolbar,
} from "@/components/academics/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACADEMIC_ENTITIES, labelForValue } from "@/lib/academics/constants";
import { academicLookups, getProgramme, listProgrammes } from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Programmes" };

export default async function ProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    edit?: string;
    updated?: string;
    error?: string;
  }>;
}) {
  const context = await requireCapability("manage_academics");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const archived = params.archived === "1";
  const [list, lookups, editing] = await Promise.all([
    listProgrammes(institutionId, { q: params.q, archived, page }),
    academicLookups(institutionId),
    params.edit ? getProgramme(institutionId, params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Programmes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A programme belongs to one department. The courses it requires are linked
          from the courses screen, so a shared course is never duplicated per
          programme.
        </p>
      </div>

      <AcademicsNav current="programme" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit programme" : "Add programme"}</CardTitle>
          <CardDescription>Codes are unique within the institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="programme" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.programme.label}</CardTitle>
          <CardDescription>Search by name or code, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="programme"
            q={params.q}
            archived={archived}
            total={list.total}
          />

          {list.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived programmes." : "No programmes yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="programme"
                columns={["Programme", "Code", "Department", "Faculty", "Level", "Years"]}
                rows={list.rows.map((programme) => ({
                  id: programme.id,
                  archived: Boolean(programme.archived_at),
                  cells: [
                    <span key="name" className="font-medium">
                      {programme.name}
                    </span>,
                    <span key="code" className="font-mono text-xs">
                      {programme.code}
                    </span>,
                    <span key="dept" className="text-xs text-muted-foreground">
                      {programme.departmentName}
                    </span>,
                    <span key="faculty" className="text-xs text-muted-foreground">
                      {programme.facultyName}
                    </span>,
                    <span key="level" className="text-xs">
                      {labelForValue(programme.level)}
                    </span>,
                    <span key="years" className="text-xs tabular-nums">
                      {programme.duration_years}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.programme.path}
                page={list.page}
                pageCount={list.pageCount}
                q={params.q}
                archived={archived}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
