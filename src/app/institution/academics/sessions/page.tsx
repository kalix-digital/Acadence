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
import {
  academicLookups,
  getSemester,
  getSession,
  listSemesters,
  listSessions,
} from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Sessions and semesters" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    spage?: string;
    edit?: string;
    semester?: string;
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
  const semesterPage = Number(params.spage ?? 1) || 1;
  const archived = params.archived === "1";

  const [sessions, semesters, lookups, editingSession, editingSemester] = await Promise.all([
    listSessions(institutionId, { q: params.q, archived, page }),
    listSemesters(institutionId, { archived, page: semesterPage }),
    academicLookups(institutionId),
    params.edit ? getSession(institutionId, params.edit) : Promise.resolve(null),
    params.semester ? getSemester(institutionId, params.semester) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Sessions and semesters
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sessions run for a full academic year; semesters split a session into
          teaching and examination periods. Timetabling in later phases is scoped
          to a semester.
        </p>
      </div>

      <AcademicsNav current="session" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editingSession ? "Edit session" : "Add academic session"}</CardTitle>
          <CardDescription>
            Session names are unique, and a session must end after it starts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="session" record={editingSession} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic sessions</CardTitle>
          <CardDescription>Search by name, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="session"
            q={params.q}
            archived={archived}
            total={sessions.total}
          />

          {sessions.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived sessions." : "No sessions yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="session"
                columns={["Session", "Dates", "Status"]}
                rows={sessions.rows.map((session) => ({
                  id: session.id,
                  archived: Boolean(session.archived_at),
                  cells: [
                    <span key="name" className="font-medium">
                      {session.name}
                    </span>,
                    <span key="dates" className="text-xs text-muted-foreground">
                      {formatDate(session.starts_on)} – {formatDate(session.ends_on)}
                    </span>,
                    <span key="status" className="text-xs">
                      {labelForValue(session.status)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.session.path}
                page={sessions.page}
                pageCount={sessions.pageCount}
                q={params.q}
                archived={archived}
                extraParams={{ spage: semesterPage > 1 ? String(semesterPage) : undefined }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingSemester ? "Edit semester" : "Add semester"}</CardTitle>
          <CardDescription>
            Semesters are numbered within a session; teaching must end before
            examinations start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="semester" record={editingSemester} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semesters</CardTitle>
          <CardDescription>
            {semesters.total} semester{semesters.total === 1 ? "" : "s"} in this
            view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {semesters.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived semesters." : "No semesters yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="semester"
                columns={["Semester", "Session", "Teaching", "Examinations", "Status"]}
                rows={semesters.rows.map((semester) => ({
                  id: semester.id,
                  archived: Boolean(semester.archived_at),
                  cells: [
                    <span key="name" className="font-medium">
                      {semester.sequence}. {semester.name}
                    </span>,
                    <span key="session" className="text-xs text-muted-foreground">
                      {semester.sessionName}
                    </span>,
                    <span key="teaching" className="text-xs text-muted-foreground">
                      {formatDate(semester.teaching_starts_on)} –{" "}
                      {formatDate(semester.teaching_ends_on)}
                    </span>,
                    <span key="exams" className="text-xs text-muted-foreground">
                      {formatDate(semester.exam_starts_on)} –{" "}
                      {formatDate(semester.exam_ends_on)}
                    </span>,
                    <span key="status" className="text-xs">
                      {labelForValue(semester.status)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.semester.path}
                page={semesters.page}
                pageCount={semesters.pageCount}
                archived={archived}
                pageParam="spage"
                extraParams={{ page: page > 1 ? String(page) : undefined }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
