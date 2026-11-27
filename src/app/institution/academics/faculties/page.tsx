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
import { ACADEMIC_ENTITIES } from "@/lib/academics/constants";
import { academicLookups, getFaculty, listFaculties } from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Faculties" };

export default async function FacultiesPage({
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
    listFaculties(institutionId, { q: params.q, archived, page }),
    academicLookups(institutionId),
    params.edit ? getFaculty(institutionId, params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Faculties</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Faculties sit at institution level and may optionally belong to a campus.
          A faculty administrator only manages their own faculty.
        </p>
      </div>

      <AcademicsNav current="faculty" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit faculty" : "Add faculty"}</CardTitle>
          <CardDescription>Codes are unique within the institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="faculty" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.faculty.label}</CardTitle>
          <CardDescription>Search by name or code, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="faculty"
            q={params.q}
            archived={archived}
            total={list.total}
          />

          {list.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived faculties." : "No faculties yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="faculty"
                columns={["Faculty", "Code", "Campus", "Added"]}
                rows={list.rows.map((faculty) => ({
                  id: faculty.id,
                  archived: Boolean(faculty.archived_at),
                  cells: [
                    <span key="name" className="font-medium">
                      {faculty.name}
                    </span>,
                    <span key="code" className="font-mono text-xs">
                      {faculty.code}
                    </span>,
                    <span key="campus" className="text-xs text-muted-foreground">
                      {faculty.campusName ?? "Institution-wide"}
                    </span>,
                    <span key="created" className="text-xs text-muted-foreground">
                      {formatDate(faculty.created_at)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.faculty.path}
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
