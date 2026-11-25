import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  InstitutionProfileForm,
  InstitutionSettingsForm,
} from "@/components/institutions/settings-forms";
import { InstitutionStatusBadge } from "@/components/institutions/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCapability } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";
import { getInstitution, getInstitutionSettings } from "@/lib/institutions/data";

export const metadata: Metadata = { title: "Institution settings" };

export default async function InstitutionSettingsPage() {
  const context = await requireCapability("manage_institution");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return (
      <p className="text-sm text-muted-foreground">
        No active institution is selected.
      </p>
    );
  }

  const [institution, settings] = await Promise.all([
    getInstitution(institutionId),
    getInstitutionSettings(institutionId),
  ]);

  if (!institution) {
    return (
      <p className="text-sm text-muted-foreground">
        This institution could not be loaded.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link
          href="/institution"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Institution settings
          </h1>
          <InstitutionStatusBadge status={institution.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Provisioned {formatDate(institution.created_at)}. Status and slug are
          managed by Acadence platform administrators.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile and branding</CardTitle>
          <CardDescription>
            Shown to your members across the institution workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstitutionProfileForm institution={institution} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic defaults</CardTitle>
          <CardDescription>
            Applied by the timetable engine in later phases. Changes here take
            effect immediately for new scheduling work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstitutionSettingsForm
            institutionId={institutionId}
            settings={settings}
          />
        </CardContent>
      </Card>
    </div>
  );
}
