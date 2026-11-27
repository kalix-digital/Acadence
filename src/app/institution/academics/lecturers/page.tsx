import type { Metadata } from "next";
import { AcademicForm } from "@/components/academics/forms";
import { ImportPanel } from "@/components/academics/import-form";
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
import { academicLookups, getLecturer, listLecturers } from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Lecturers" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function LecturersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    department?: string;
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

  const [lecturers, lookups, editing] = await Promise.all([
    listLecturers(institutionId, {
      q: params.q,
      archived,
      page,
      departmentId: params.department,
    }),
    academicLookups(institutionId),
    params.edit ? getLecturer(institutionId, params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Lecturers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teaching staff belong to a department. Like students, a lecturer is
          recorded before an account is linked.
        </p>
      </div>

      <AcademicsNav current="lecturer" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit lecturer" : "Add lecturer"}</CardTitle>
          <CardDescription>
            Staff numbers are unique across the institution; an email is
            optional, but unique when given.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="lecturer" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import lecturers</CardTitle>
          <CardDescription>
            Upload a CSV, check every row, then import. Existing staff numbers
            and addresses are detected before anything is written.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportPanel entity="lecturer" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.lecturer.label}</CardTitle>
          <CardDescription>Search, filter by department, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="lecturer"
            q={params.q}
            archived={archived}
            total={lecturers.total}
          />

          <form className="flex flex-wrap items-center gap-2">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            {archived && <input type="hidden" name="archived" value="1" />}
            <select name="department" defaultValue={params.department ?? ""} className={selectClass}>
              <option value="">All departments</option>
              {lookups.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} — {department.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Apply filter
            </button>
          </form>

          {lecturers.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived lecturers." : "No lecturers yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="lecturer"
                columns={["Lecturer", "Department", "Contact", "Status"]}
                rows={lecturers.rows.map((lecturer) => ({
                  id: lecturer.id,
                  archived: Boolean(lecturer.archived_at),
                  cells: [
                    <span key="name">
                      <span className="font-mono text-xs text-muted-foreground">
                        {lecturer.staff_number}
                      </span>
                      <span className="mt-0.5 block font-medium">
                        {[lecturer.title, lecturer.first_name, lecturer.last_name]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    </span>,
                    <span key="department" className="text-xs text-muted-foreground">
                      {lecturer.departmentName}
                      <span className="mt-0.5 block">{lecturer.facultyName}</span>
                    </span>,
                    <span key="contact" className="text-xs text-muted-foreground">
                      {lecturer.email ?? "—"}
                      <span className="mt-0.5 block">{lecturer.phone ?? ""}</span>
                    </span>,
                    <span key="status" className="text-xs">
                      {labelForValue(lecturer.status)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.lecturer.path}
                page={lecturers.page}
                pageCount={lecturers.pageCount}
                q={params.q}
                archived={archived}
                extraParams={{ department: params.department }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
