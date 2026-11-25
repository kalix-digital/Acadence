import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, MailPlus, ShieldCheck } from "lucide-react";
import { InviteForm } from "@/components/institutions/invite-form";
import {
  InstitutionStatusBadge,
  MembershipStatusBadge,
  RoleLabel,
} from "@/components/institutions/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  changeInstitutionStatusAction,
  inviteInstitutionAdminAction,
} from "@/app/platform/actions";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  getInstitution,
  listActivity,
  listInvitations,
  listMembers,
  pendingInvitations,
} from "@/lib/institutions/data";
import { INITIATION_ROLE_OPTIONS } from "@/lib/institutions/constants";

export const metadata: Metadata = { title: "Institution" };

export default async function PlatformInstitutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const institution = await getInstitution(id);

  if (!institution) notFound();

  const [members, invitations, activity] = await Promise.all([
    listMembers(id),
    listInvitations(id),
    listActivity(id, 12),
  ]);
  const pending = pendingInvitations(invitations);
  const administrators = members.filter(
    (member) => member.role === "institution_admin",
  );

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/platform/institutions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Institutions
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {institution.name}
          </h1>
          <InstitutionStatusBadge status={institution.status} />
          <Badge variant="outline" className="font-mono text-[0.65rem]">
            {institution.slug}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {institution.type} · {institution.timezone} · created{" "}
          {formatDate(institution.created_at)}
        </p>
      </div>

      {query.created && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          Institution provisioned. Create an invitation for its first
          administrator, then activate the institution.
        </p>
      )}
      {query.updated === "status" && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          Institution status updated.
        </p>
      )}
      {query.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {query.error}
        </p>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Status
            </CardTitle>
            <CardDescription>
              Only active institutions grant their members access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Current: <InstitutionStatusBadge status={institution.status} />
            </p>
            <div className="flex flex-wrap gap-2">
              {institution.status !== "active" && (
                <form action={changeInstitutionStatusAction}>
                  <input type="hidden" name="institutionId" value={institution.id} />
                  <input type="hidden" name="status" value="active" />
                  <SubmitButton size="sm" pendingLabel="Activating…">
                    Activate
                  </SubmitButton>
                </form>
              )}
              {institution.status !== "suspended" && (
                <form action={changeInstitutionStatusAction}>
                  <input type="hidden" name="institutionId" value={institution.id} />
                  <input type="hidden" name="status" value="suspended" />
                  <SubmitButton size="sm" variant="outline" pendingLabel="Suspending…">
                    Suspend
                  </SubmitButton>
                </form>
              )}
              {institution.status !== "archived" && (
                <form action={changeInstitutionStatusAction}>
                  <input type="hidden" name="institutionId" value={institution.id} />
                  <input type="hidden" name="status" value="archived" />
                  <SubmitButton size="sm" variant="ghost" pendingLabel="Archiving…">
                    Archive
                  </SubmitButton>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Institution administrators maintain these details from their own
              settings screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="capitalize">{institution.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Timezone</p>
              <p>{institution.timezone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Brand colour</p>
              <p className="font-mono text-xs">
                {institution.brand_primary ?? "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accent colour</p>
              <p className="font-mono text-xs">
                {institution.brand_accent ?? "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailPlus className="size-4 text-primary" /> Invite a member
            </CardTitle>
            <CardDescription>
              Email delivery uses Resend when configured; otherwise the
              single-use link is returned here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm
              action={inviteInstitutionAdminAction}
              institutionId={institution.id}
              defaultRole="institution_admin"
              roleOptions={INITIATION_ROLE_OPTIONS}
              submitLabel="Create invitation"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Administrators
            </CardTitle>
            <CardDescription>
              {administrators.length} institution administrator
              {administrators.length === 1 ? "" : "s"} · {members.length} member
              {members.length === 1 ? "" : "s"} in total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No members yet. Invite the first administrator.
              </p>
            ) : (
              <ul className="space-y-3">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <RoleLabel role={member.role} />
                      <MembershipStatusBadge status={member.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              {pending.length} awaiting acceptance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending invitations.
              </p>
            ) : (
              <ul className="space-y-3">
                {pending.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {formatDate(invitation.expires_at)}
                      </p>
                    </div>
                    <RoleLabel role={invitation.role} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Provisioning, membership and invitation events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            ) : (
              <ol className="space-y-3">
                {activity.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm">{event.summary}</p>
                      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                        {formatDateTime(event.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[0.6rem]">
                      {event.action.split(".")[1] ?? event.action}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
