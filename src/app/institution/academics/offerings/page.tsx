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
  getOffering,
  getOfferingGroup,
  getOfferingLecturer,
  listOfferingGroups,
  listOfferingLecturers,
  listOfferings,
} from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Course offerings" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function OfferingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    lpage?: string;
    gpage?: string;
    edit?: string;
    lecturer?: string;
    link?: string;
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
  const lecturerPage = Number(params.lpage ?? 1) || 1;
  const groupPage = Number(params.gpage ?? 1) || 1;
  const archived = params.archived === "1";

  const [offerings, assignments, links, lookups, editing, editingLecturer, editingGroup] =
    await Promise.all([
      listOfferings(institutionId, {
        q: params.q,
        archived,
        page,
        semesterId: params.semester,
      }),
      listOfferingLecturers(institutionId, { archived, page: lecturerPage }),
      listOfferingGroups(institutionId, { archived, page: groupPage }),
      academicLookups(institutionId),
      params.edit ? getOffering(institutionId, params.edit) : Promise.resolve(null),
      params.lecturer
        ? getOfferingLecturer(institutionId, params.lecturer)
        : Promise.resolve(null),
      params.link ? getOfferingGroup(institutionId, params.link) : Promise.resolve(null),
    ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Course offerings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An offering is one course in one semester: a coordinator, the lecturers
          who teach it, and the student groups that attend. Timetabling in Phase 6
          schedules offerings.
        </p>
      </div>

      <AcademicsNav current="offering" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit offering" : "Add offering"}</CardTitle>
          <CardDescription>
            A course is offered once per semester, and the semester must belong to
            the chosen session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="offering" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.offering.label}</CardTitle>
          <CardDescription>Search by course, filter by semester, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="offering"
            q={params.q}
            archived={archived}
            total={offerings.total}
          />

          <form className="flex flex-wrap items-center gap-2">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            {archived && <input type="hidden" name="archived" value="1" />}
            <select name="semester" defaultValue={params.semester ?? ""} className={selectClass}>
              <option value="">All semesters</option>
              {lookups.semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.sessionName} · {semester.sequence}. {semester.name}
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

          {offerings.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived offerings." : "No course offerings yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="offering"
                columns={["Course", "Session and semester", "Coordinator", "Teaching", "Status"]}
                rows={offerings.rows.map((offering) => ({
                  id: offering.id,
                  archived: Boolean(offering.archived_at),
                  cells: [
                    <span key="course">
                      <span className="font-mono text-xs text-muted-foreground">
                        {offering.courseCode} · {offering.courseUnits} units
                      </span>
                      <span className="mt-0.5 block font-medium">{offering.courseTitle}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {offering.departmentName}
                      </span>
                    </span>,
                    <span key="period" className="text-xs text-muted-foreground">
                      {offering.sessionName}
                      <span className="mt-0.5 block">
                        {offering.semesterSequence}. {offering.semesterName}
                      </span>
                    </span>,
                    <span key="coordinator" className="text-xs">
                      {offering.coordinatorName ?? "—"}
                    </span>,
                    <span key="teaching" className="text-xs text-muted-foreground">
                      {offering.lecturerCount} lecturer{offering.lecturerCount === 1 ? "" : "s"}
                      <span className="mt-0.5 block">
                        {offering.groupCount} group{offering.groupCount === 1 ? "" : "s"}
                      </span>
                    </span>,
                    <span key="status" className="text-xs">
                      {labelForValue(offering.status)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.offering.path}
                page={offerings.page}
                pageCount={offerings.pageCount}
                q={params.q}
                archived={archived}
                extraParams={{
                  lpage: lecturerPage > 1 ? String(lecturerPage) : undefined,
                  gpage: groupPage > 1 ? String(groupPage) : undefined,
                  semester: params.semester,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {editingLecturer ? "Edit lecturer assignment" : "Assign a lecturer"}
          </CardTitle>
          <CardDescription>
            An offering can have several lecturers; one is the lead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="offeringLecturer" record={editingLecturer} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.offeringLecturer.label}</CardTitle>
          <CardDescription>
            {assignments.total} assignment{assignments.total === 1 ? "" : "s"} in this view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived assignments." : "No lecturer assignments yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="offeringLecturer"
                editParam="lecturer"
                columns={["Offering", "Lecturer", "Role", "Contact hours"]}
                rows={assignments.rows.map((assignment) => ({
                  id: assignment.id,
                  archived: Boolean(assignment.archived_at),
                  cells: [
                    <span key="offering" className="font-mono text-xs">
                      {assignment.offeringLabel}
                    </span>,
                    <span key="lecturer">
                      <span className="font-medium">{assignment.lecturerName}</span>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        {assignment.staffNumber}
                      </span>
                    </span>,
                    <span key="role" className="text-xs">
                      {labelForValue(assignment.role)}
                    </span>,
                    <span key="hours" className="text-xs tabular-nums">
                      {assignment.contact_hours ?? "—"}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.offeringLecturer.path}
                page={assignments.page}
                pageCount={assignments.pageCount}
                archived={archived}
                pageParam="lpage"
                extraParams={{
                  page: page > 1 ? String(page) : undefined,
                  gpage: groupPage > 1 ? String(groupPage) : undefined,
                  semester: params.semester,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingGroup ? "Edit offering group" : "Link a student group"}</CardTitle>
          <CardDescription>
            Groups link an offering to the cohorts that attend it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="offeringGroup" record={editingGroup} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.offeringGroup.label}</CardTitle>
          <CardDescription>
            {links.total} link{links.total === 1 ? "" : "s"} in this view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {links.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived group links." : "No groups linked yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="offeringGroup"
                editParam="link"
                columns={["Offering", "Student group"]}
                rows={links.rows.map((link) => ({
                  id: link.id,
                  archived: Boolean(link.archived_at),
                  cells: [
                    <span key="offering" className="font-mono text-xs">
                      {link.offeringLabel}
                    </span>,
                    <span key="group">
                      <span className="font-mono text-xs text-muted-foreground">
                        {link.groupCode}
                      </span>
                      <span className="mt-0.5 block font-medium">{link.groupName}</span>
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.offeringGroup.path}
                page={links.page}
                pageCount={links.pageCount}
                archived={archived}
                pageParam="gpage"
                extraParams={{
                  page: page > 1 ? String(page) : undefined,
                  lpage: lecturerPage > 1 ? String(lecturerPage) : undefined,
                  semester: params.semester,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
