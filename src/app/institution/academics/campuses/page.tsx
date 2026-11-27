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
  getCampus,
  listCampuses,
} from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Campuses" };

export default async function CampusesPage({
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
    listCampuses(institutionId, { q: params.q, archived, page }),
    academicLookups(institutionId),
    params.edit ? getCampus(institutionId, params.edit) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Campuses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional sites. A faculty may belong to one campus, but single-site
          institutions can skip campuses entirely.
        </p>
      </div>

      <AcademicsNav current="campus" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit campus" : "Add campus"}</CardTitle>
          <CardDescription>
            Codes are unique within {context.institution?.name ?? "the institution"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="campus" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.campus.label}</CardTitle>
          <CardDescription>
            Search by name or code, then edit or archive a record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="campus"
            q={params.q}
            archived={archived}
            total={list.total}
          />

          {list.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived campuses." : "No campuses yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="campus"
                columns={["Campus", "Code", "Address", "Added"]}
                rows={list.rows.map((campus) => ({
                  id: campus.id,
                  archived: Boolean(campus.archived_at),
                  cells: [
                    <span key="name" className="font-medium">
                      {campus.name}
                    </span>,
                    <span key="code" className="font-mono text-xs">
                      {campus.code}
                    </span>,
                    <span key="address" className="text-xs text-muted-foreground">
                      {campus.address ?? "—"}
                    </span>,
                    <span key="created" className="text-xs text-muted-foreground">
                      {formatDate(campus.created_at)}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.campus.path}
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
