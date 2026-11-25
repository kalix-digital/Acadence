import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { InstitutionStatusBadge } from "@/components/institutions/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { listInstitutions } from "@/lib/institutions/data";

export const metadata: Metadata = { title: "Institutions" };

export default async function PlatformInstitutionsPage() {
  const institutions = await listInstitutions();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Platform administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Institutions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provision tenants, control their status and assign the first
            administrators.
          </p>
        </div>
        <Button asChild className="h-9 rounded-xl">
          <Link href="/platform/institutions/new">
            <Plus /> Provision institution
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{institutions.length} institution{institutions.length === 1 ? "" : "s"}</CardTitle>
          <CardDescription>
            Status is platform-controlled. Only an active institution grants its
            members access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {institutions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm font-medium">No institutions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Provision one, then invite its institution administrator.
              </p>
              <Button asChild className="mt-4 h-9 rounded-xl">
                <Link href="/platform/institutions/new">Provision institution</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institution</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Active members</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {institutions.map((institution) => (
                  <TableRow key={institution.id}>
                    <TableCell>
                      <Link
                        href={`/platform/institutions/${institution.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {institution.name}
                      </Link>
                      <span className="mt-0.5 block font-mono text-[0.7rem] text-muted-foreground">
                        {institution.slug}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize text-sm text-muted-foreground">
                      {institution.type}
                    </TableCell>
                    <TableCell>
                      <InstitutionStatusBadge status={institution.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {institution.memberCount}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(institution.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
