import type { Metadata } from "next";
import Link from "next/link";
import { Archive } from "lucide-react";
import { archiveTimetableDraftAction } from "@/app/institution/timetables/actions";
import { TimetablesNav, TimetableFlash } from "@/components/timetables/shell";
import { TimetableStatusBadge, TimetableTable } from "@/components/timetables/ui";
import { TimetableDraftForm } from "@/components/timetables/forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTimetableAccess } from "@/lib/timetables/access";
import { listDrafts, listVersions, timetableLookups } from "@/lib/timetables/data";

export const metadata: Metadata = { title: "Timetable management" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function TimetablesPage({
  searchParams,
}: {
  searchParams: Promise<{
    semester?: string;
    archived?: string;
    updated?: string;
    error?: string;
    page?: string;
  }>;
}) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const archived = params.archived === "1";
  const lookups = await timetableLookups(institutionId);
  const semesterId = params.semester ?? lookups.semesters[0]?.id;

  const [drafts, versions] = await Promise.all([
    listDrafts(institutionId, {
      semesterId,
      archived,
      page: Number(params.page ?? 1) || 1,
    }),
    listVersions(institutionId, { semesterId }),
  ]);

  const semesterOptions = lookups.semesters.map((semester) => ({
    value: semester.id,
    label: `${semester.sessionName} · ${semester.name}`,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timetable management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drafts are working documents; publishing snapshots one into an immutable version.
          A new version supersedes the live one, which stays in history.
        </p>
      </div>

      <TimetablesNav current="overview" />
      <TimetableFlash updated={params.updated} error={params.error} />

      {lookups.semesters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Create a semester in academic administration first: a draft belongs to one semester.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Create a draft</CardTitle>
              <CardDescription>
                A department or faculty draft publishes into the semester&apos;s live version
                while keeping every other scope&apos;s entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimetableDraftForm
                lookups={{
                  semesters: semesterOptions,
                  departments: lookups.departments.map((department) => ({
                    value: department.id,
                    label: `${department.code} · ${department.name}`,
                  })),
                  faculties: lookups.faculties.map((faculty) => ({
                    value: faculty.id,
                    label: `${faculty.code} · ${faculty.name}`,
                  })),
                }}
                defaultSemesterId={semesterId}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drafts</CardTitle>
              <CardDescription>
                Open a draft to edit its grid, import entries or publish it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-border/70 p-0.5">
                  <Link
                    href={semesterId ? `/institution/timetables?semester=${semesterId}` : "/institution/timetables"}
                    className={
                      archived
                        ? "rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        : "rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    }
                  >
                    Active
                  </Link>
                  <Link
                    href={`/institution/timetables?archived=1${semesterId ? `&semester=${semesterId}` : ""}`}
                    className={
                      archived
                        ? "rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        : "rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    }
                  >
                    Archived
                  </Link>
                </div>

                <form className="flex items-center gap-2">
                  {archived && <input type="hidden" name="archived" value="1" />}
                  <select name="semester" defaultValue={semesterId ?? ""} className={selectClass}>
                    {semesterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Show
                  </button>
                </form>
              </div>

              <TimetableTable
                columns={["Draft", "Scope", "Semester", "Entries", "Status"]}
                empty={archived ? "No archived drafts." : "No drafts for this semester yet."}
                rows={drafts.rows.map((draft) => ({
                  id: draft.id,
                  cells: [
                    <span key="title">
                      <Link
                        href={`/institution/timetables/drafts/${draft.id}`}
                        className="font-medium hover:underline"
                      >
                        {draft.title}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Updated {new Date(draft.updated_at).toLocaleDateString()}
                      </span>
                    </span>,
                    <span key="scope" className="text-xs">
                      {draft.scopeName}
                    </span>,
                    <span key="semester" className="text-xs text-muted-foreground">
                      {draft.sessionName}
                      <span className="mt-0.5 block">{draft.semesterName}</span>
                    </span>,
                    <span key="entries" className="text-xs tabular-nums">
                      {draft.entryCount}
                    </span>,
                    <TimetableStatusBadge key="status" status={draft.status} />,
                  ],
                  actions: (
                    <>
                      <Link
                        href={`/institution/timetables/drafts/${draft.id}`}
                        className="rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Open
                      </Link>
                      <form action={archiveTimetableDraftAction}>
                        <input type="hidden" name="id" value={draft.id} />
                        <input type="hidden" name="archived" value={draft.archived_at ? "0" : "1"} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border/70 p-1.5 text-muted-foreground hover:text-foreground"
                          title={draft.archived_at ? "Restore" : "Archive"}
                        >
                          <Archive className="size-3.5" />
                        </button>
                      </form>
                    </>
                  ),
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Versions</CardTitle>
              <CardDescription>
                Every published version for this semester. The live one is the only version
                student and lecturer views read.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimetableTable
                columns={["Version", "Status", "Entries", "Published", "Summary"]}
                empty="Nothing published for this semester yet."
                rows={versions.map((version) => ({
                  id: version.id,
                  cells: [
                    <span key="version">
                      <Link
                        href={`/institution/timetables/versions/${version.id}`}
                        className="font-medium hover:underline"
                      >
                        v{version.version_no}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {version.semesterName}
                      </span>
                    </span>,
                    <TimetableStatusBadge key="status" status={version.status} />,
                    <span key="entries" className="text-xs tabular-nums">
                      {version.entryCount}
                    </span>,
                    <span key="published" className="text-xs">
                      {new Date(version.published_at).toLocaleString()}
                      <span className="mt-0.5 block text-muted-foreground">
                        {version.publisherName}
                      </span>
                    </span>,
                    <span key="summary" className="text-xs text-muted-foreground">
                      {version.change_summary}
                    </span>,
                  ],
                  actions: (
                    <Link
                      href={`/institution/timetables/versions/${version.id}`}
                      className="rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      View
                    </Link>
                  ),
                }))}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
