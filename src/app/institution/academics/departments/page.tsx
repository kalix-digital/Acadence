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
import {
  academicLookups,
  getDepartment,
  listDepartments,
} from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage({
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
    listDepartments(institutionId, { q: params.q, archived, page }),
    academicLookups(institutionId),
    params.edit ? getDepartment(institutionId, params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every department belongs to exactly one faculty. Faculty administrators
          manage their own departments; department administrators manage their own.
        </p>
      </div>

      <AcademicsNav current="department" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit department" : "Add department"}</CardTitle>
          <CardDescription>Codes are unique within the institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="department" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.department.label}</CardTitle>
          <CardDescription>Search by name or code, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="department"
            q={params.q}
            archived={archived}
            total={list.total}
          />

          {list.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived departments." : "No departments yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="department"
                columns={["Department", "Code", "Faculty", "Campus", "Added"]}
                rows={list.rows.map((department) => ({
                  id: department.id,
                  archived: Boolean(department.archived_at),
                  cells: [
                    <span key="name" className="font-medium">
                      {department.name}
                    </span>,
                    <span key="code" className="font-mono text-xs">
                      {department.code}
                    </span>,
                    <span key="faculty" className="text-xs text-muted-foreground">
                      {department.facultyName}
                    </span>,
                    <span key="campus" className="text-xs text-muted-foreground">
                      {department.campusName ?? "—"}
                    </span>,
                    <span key="created" className="text-xs text-muted-foreground">
                      {formatDate(department.created_at)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.department.path}
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
