import type { Metadata } from "next";
import Link from "next/link";
import { archiveTimetableVersionAction } from "@/app/institution/timetables/actions";
import { TimetablesBackLink, TimetablesNav, TimetableFlash } from "@/components/timetables/shell";
import { TimetableStatusBadge, TimetableTable } from "@/components/timetables/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTimetableAccess } from "@/lib/timetables/access";
import { listVersions, timetableLookups } from "@/lib/timetables/data";

export const metadata: Metadata = { title: "Timetable version history" };

export default async function TimetableVersionsPage({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string; archived?: string; updated?: string; error?: string }>;
}) {
  const context = await requireTimetableAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const includeArchived = params.archived === "1";
  const lookups = await timetableLookups(institutionId);
  const semesterId = params.semester ?? lookups.semesters[0]?.id;
  const versions = semesterId
    ? await listVersions(institutionId, { semesterId, includeArchived })
    : [];

  return (
    <div className="space-y-5">
      <div>
        <TimetablesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Version history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Published versions are immutable. A new publication supersedes the live version and
          keeps every earlier snapshot.
        </p>
      </div>

      <TimetablesNav current="versions" />
      <TimetableFlash updated={params.updated} error={params.error} />

      {lookups.semesters.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No semesters yet.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Versions</CardTitle>
            <CardDescription>
              {includeArchived
                ? "Every version, including those retired from the default history."
                : "Live and superseded versions. Archived versions are hidden."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-border/70 p-0.5">
                <Link
                  href={`/institution/timetables/versions?semester=${semesterId ?? ""}`}
                  className={
                    includeArchived
                      ? "rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                      : "rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  }
                >
                  Current and superseded
                </Link>
                <Link
                  href={`/institution/timetables/versions?archived=1&semester=${semesterId ?? ""}`}
                  className={
                    includeArchived
                      ? "rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      : "rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  }
                >
                  Include archived
                </Link>
              </div>

              <form className="flex items-center gap-2">
                {includeArchived && <input type="hidden" name="archived" value="1" />}
                <select
                  name="semester"
                  defaultValue={semesterId ?? ""}
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  {lookups.semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.sessionName} · {semester.name}
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
              columns={["Version", "Status", "Entries", "Published by", "Summary"]}
              empty="No versions yet."
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
                  <span key="publisher" className="text-xs">
                    {version.publisherName}
                    <span className="mt-0.5 block text-muted-foreground">
                      {new Date(version.published_at).toLocaleString()}
                    </span>
                  </span>,
                  <span key="summary" className="text-xs text-muted-foreground">
                    {version.change_summary}
                  </span>,
                ],
                actions: (
                  <>
                    <Link
                      href={`/institution/timetables/versions/${version.id}`}
                      className="rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      View
                    </Link>
                    {version.status !== "published" && version.status !== "archived" && (
                      <form action={archiveTimetableVersionAction}>
                        <input type="hidden" name="id" value={version.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-border/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Archive
                        </button>
                      </form>
                    )}
                  </>
                ),
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
