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
import { FACILITY_ENTITIES } from "@/lib/facilities/constants";
import { facilityLookups, getBuilding, listBuildings } from "@/lib/facilities/data";

export const metadata: Metadata = { title: "Buildings" };

export default async function BuildingsPage({
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

  const [buildings, lookups, editing] = await Promise.all([
    listBuildings(institutionId, { q: params.q, archived, page }),
    facilityLookups(institutionId),
    params.edit ? getBuilding(institutionId, params.edit) : Promise.resolve(null),
  ]);

  const basePath = FACILITY_ENTITIES.building.path;

  return (
    <div className="space-y-5">
      <div>
        <FacilitiesBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Buildings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buildings sit on a campus. If the institution has no campus yet, the first
          building creates a Main campus automatically.
        </p>
      </div>

      <FacilitiesNav current="building" />
      <FacilityFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit building" : "Add building"}</CardTitle>
          <CardDescription>Codes are unique across the institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <FacilityForm entity="building" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{FACILITY_ENTITIES.building.label}</CardTitle>
          <CardDescription>Search, edit, archive or restore a building.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FacilityToolbar
            basePath={basePath}
            q={params.q}
            archived={archived}
            total={buildings.total}
          />

          <FacilityTable
            columns={["Building", "Campus", "Address"]}
            empty={archived ? "No archived buildings." : "No buildings yet."}
            rows={buildings.rows.map((building) => ({
              id: building.id,
              archived: Boolean(building.archived_at),
              cells: [
                <span key="name">
                  <span className="font-mono text-xs text-muted-foreground">{building.code}</span>
                  <span className="mt-0.5 block font-medium">{building.name}</span>
                </span>,
                <span key="campus" className="text-xs">
                  {building.campusName}
                </span>,
                <span key="address" className="text-xs text-muted-foreground">
                  {building.address ?? "—"}
                </span>,
              ],
              actions: (
                <>
                  <EditLink basePath={basePath} id={building.id} />
                  <ArchiveButton
                    entity="building"
                    id={building.id}
                    archived={Boolean(building.archived_at)}
                  />
                </>
              ),
            }))}
          />

          <FacilityPagination
            basePath={basePath}
            page={buildings.page}
            pageCount={buildings.pageCount}
            q={params.q}
            archived={archived}
          />
        </CardContent>
      </Card>
    </div>
  );
}
