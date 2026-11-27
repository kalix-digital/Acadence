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
  getCourse,
  getCurriculumEntry,
  listCourses,
  listCurriculum,
} from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Courses and curriculum" };

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    cpage?: string;
    edit?: string;
    curriculum?: string;
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
  const curriculumPage = Number(params.cpage ?? 1) || 1;
  const archived = params.archived === "1";

  const [courses, curriculum, lookups, editingCourse, editingCurriculum] = await Promise.all([
    listCourses(institutionId, { q: params.q, archived, page }),
    listCurriculum(institutionId, { archived, page: curriculumPage }),
    academicLookups(institutionId),
    params.edit ? getCourse(institutionId, params.edit) : Promise.resolve(null),
    params.curriculum
      ? getCurriculumEntry(institutionId, params.curriculum)
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Courses and curriculum</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Courses belong to a department. A programme&apos;s curriculum links the
          courses it requires, at a level and as required or elective.
        </p>
      </div>

      <AcademicsNav current="course" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editingCourse ? "Edit course" : "Add course"}</CardTitle>
          <CardDescription>Codes are unique within the institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="course" record={editingCourse} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.course.label}</CardTitle>
          <CardDescription>Search by title or code, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="course"
            q={params.q}
            archived={archived}
            total={courses.total}
          />

          {courses.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived courses." : "No courses yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="course"
                columns={["Course", "Department", "Units", "Level", "Room"]}
                rows={courses.rows.map((course) => ({
                  id: course.id,
                  archived: Boolean(course.archived_at),
                  cells: [
                    <span key="title">
                      <span className="font-mono text-xs text-muted-foreground">
                        {course.code}
                      </span>
                      <span className="mt-0.5 block font-medium">{course.title}</span>
                    </span>,
                    <span key="dept" className="text-xs text-muted-foreground">
                      {course.departmentName}
                      <span className="mt-0.5 block">{course.facultyName}</span>
                    </span>,
                    <span key="units" className="text-xs tabular-nums">
                      {course.units}
                    </span>,
                    <span key="level" className="text-xs tabular-nums">
                      {course.level}
                    </span>,
                    <span key="room" className="text-xs">
                      {labelForValue(course.required_room_type)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.course.path}
                page={courses.page}
                pageCount={courses.pageCount}
                q={params.q}
                archived={archived}
                extraParams={{ cpage: curriculumPage > 1 ? String(curriculumPage) : undefined }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {editingCurriculum ? "Edit curriculum entry" : "Add to a programme"}
          </CardTitle>
          <CardDescription>
            Link an existing course to a programme. The same course can belong to
            several programmes without being duplicated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm
            entity="curriculum"
            record={editingCurriculum}
            lookups={lookups}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.curriculum.label}</CardTitle>
          <CardDescription>
            {curriculum.total} entr{curriculum.total === 1 ? "y" : "ies"} in this view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {curriculum.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived
                ? "No archived curriculum entries."
                : "No curriculum entries yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="curriculum"
                columns={["Programme", "Course", "Level", "Requirement"]}
                rows={curriculum.rows.map((entry) => ({
                  id: entry.id,
                  archived: Boolean(entry.archived_at),
                  cells: [
                    <span key="programme">
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.programmeCode}
                      </span>
                      <span className="mt-0.5 block font-medium">{entry.programmeName}</span>
                    </span>,
                    <span key="course">
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.courseCode}
                      </span>
                      <span className="mt-0.5 block">{entry.courseTitle}</span>
                    </span>,
                    <span key="level" className="text-xs tabular-nums">
                      {entry.level}
                    </span>,
                    <span key="requirement" className="text-xs">
                      {labelForValue(entry.requirement)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.curriculum.path}
                page={curriculum.page}
                pageCount={curriculum.pageCount}
                archived={archived}
                pageParam="cpage"
                extraParams={{ page: page > 1 ? String(page) : undefined }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
