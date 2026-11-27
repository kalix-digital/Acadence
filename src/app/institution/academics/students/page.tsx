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
import { ACADEMIC_ENTITIES, LEVEL_OPTIONS, labelForValue } from "@/lib/academics/constants";
import { academicLookups, getStudent, listStudents } from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Students" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    programme?: string;
    level?: string;
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
  const level = Number(params.level ?? 0) || undefined;
  const archived = params.archived === "1";

  const [students, lookups, editing] = await Promise.all([
    listStudents(institutionId, {
      q: params.q,
      archived,
      page,
      programmeId: params.programme,
      level,
    }),
    academicLookups(institutionId),
    params.edit ? getStudent(institutionId, params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A student record exists before any account does: import or enter the
          roster now, and link each person to an account when they accept an
          invitation.
        </p>
      </div>

      <AcademicsNav current="student" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit student" : "Add student"}</CardTitle>
          <CardDescription>
            Matriculation numbers are unique across the institution. An email is
            optional, but unique when given.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="student" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import students</CardTitle>
          <CardDescription>
            Upload a CSV, check every row, then import. Existing matriculation
            numbers and addresses are detected before anything is written.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportPanel entity="student" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.student.label}</CardTitle>
          <CardDescription>Search, filter by programme or level, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="student"
            q={params.q}
            archived={archived}
            total={students.total}
          />

          <form className="flex flex-wrap items-center gap-2">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            {archived && <input type="hidden" name="archived" value="1" />}
            <select name="programme" defaultValue={params.programme ?? ""} className={selectClass}>
              <option value="">All programmes</option>
              {lookups.programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.code}
                </option>
              ))}
            </select>
            <select name="level" defaultValue={params.level ?? ""} className={selectClass}>
              <option value="">All levels</option>
              {LEVEL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Apply filters
            </button>
          </form>

          {students.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived students." : "No students yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="student"
                columns={["Student", "Programme", "Level", "Contact", "Status"]}
                rows={students.rows.map((student) => ({
                  id: student.id,
                  archived: Boolean(student.archived_at),
                  cells: [
                    <span key="name">
                      <span className="font-mono text-xs text-muted-foreground">
                        {student.matric_number}
                      </span>
                      <span className="mt-0.5 block font-medium">
                        {student.first_name} {student.last_name}
                      </span>
                    </span>,
                    <span key="programme" className="text-xs text-muted-foreground">
                      {student.programmeCode}
                      <span className="mt-0.5 block">{student.programmeName}</span>
                    </span>,
                    <span key="level" className="text-xs tabular-nums">
                      {student.level}
                    </span>,
                    <span key="contact" className="text-xs text-muted-foreground">
                      {student.email ?? "—"}
                      <span className="mt-0.5 block">{student.phone ?? ""}</span>
                    </span>,
                    <span key="status" className="text-xs">
                      {labelForValue(student.status)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.student.path}
                page={students.page}
                pageCount={students.pageCount}
                q={params.q}
                archived={archived}
                extraParams={{ programme: params.programme, level: params.level }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
