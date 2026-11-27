import type { Metadata } from "next";
import { FacilityForm } from "@/components/facilities/forms";
import { FacilitiesBackLink, FacilitiesNav } from "@/components/facilities/shell";
import {
  ArchiveButton,
  EditLink,
  FacilityFlash,
  FacilityPagination,
  FacilityTable,
  FacilityToolbar,
} from "@/components/facilities/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireFacilitiesAccess } from "@/lib/facilities/access";
import { FACILITY_ENTITIES, labelForValue } from "@/lib/facilities/constants";
import { facilityLookups, getFeature, listFeatures } from "@/lib/facilities/data";

export const metadata: Metadata = { title: "Room features" };

export default async function FeaturesPage({
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
  const context = await requireFacilitiesAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const archived = params.archived === "1";
  const page = Number(params.page ?? 1) || 1;

  const [features, lookups, editing] = await Promise.all([
    listFeatures(institutionId, { q: params.q, archived, page }),
    facilityLookups(institutionId),
    params.edit ? getFeature(institutionId, params.edit) : Promise.resolve(null),
  ]);

  const basePath = FACILITY_ENTITIES.feature.path;

  return (
    <div className="space-y-5">
      <div>
        <FacilitiesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Room features</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The institution keeps its own catalogue — projectors, laboratory benches,
          hearing loops — so equipment can be filtered and checked rather than described
          in a note.
        </p>
      </div>

      <FacilitiesNav current="feature" />
      <FacilityFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit feature" : "Add feature"}</CardTitle>
          <CardDescription>
            Names are unique per institution, ignoring case. Archiving a feature frees its
            name again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FacilityForm entity="feature" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{FACILITY_ENTITIES.feature.label}</CardTitle>
          <CardDescription>Search, edit, archive or restore a feature.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FacilityToolbar
            basePath={basePath}
            q={params.q}
            archived={archived}
            total={features.total}
            placeholder="Search feature name"
          />

          <FacilityTable
            columns={["Feature", "Category"]}
            empty={archived ? "No archived features." : "No features yet."}
            rows={features.rows.map((feature) => ({
              id: feature.id,
              archived: Boolean(feature.archived_at),
              cells: [
                <span key="name" className="font-medium">
                  {feature.name}
                </span>,
                <span key="category" className="text-xs">
                  {labelForValue(feature.category)}
                </span>,
              ],
              actions: (
                <>
                  <EditLink basePath={basePath} id={feature.id} />
                  <ArchiveButton
                    entity="feature"
                    id={feature.id}
                    archived={Boolean(feature.archived_at)}
                  />
                </>
              ),
            }))}
          />

          <FacilityPagination
            basePath={basePath}
            page={features.page}
            pageCount={features.pageCount}
            q={params.q}
            archived={archived}
          />
        </CardContent>
      </Card>
    </div>
  );
}
