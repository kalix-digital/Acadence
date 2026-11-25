import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InstitutionForm } from "@/components/platform/institution-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Provision institution" };

export default function NewInstitutionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/platform/institutions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Institutions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Provision an institution
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The institution is created as pending with default academic settings.
          Invite its first administrator from the institution page, then activate
          it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institution profile</CardTitle>
          <CardDescription>
            Names, slugs and branding can be refined later by the institution
            administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstitutionForm />
        </CardContent>
      </Card>
    </div>
  );
}
