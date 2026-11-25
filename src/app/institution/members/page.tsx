import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MailPlus, Users } from "lucide-react";
import {
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
  revokeInvitationAction,
  setMemberStatusAction,
} from "@/app/institution/members/actions";
import { InviteForm } from "@/components/institutions/invite-form";
import {
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireCapability } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";
import { listInvitations, listMembers, pendingInvitations } from "@/lib/institutions/data";
import { INVITABLE_ROLES } from "@/types/database";

export const metadata: Metadata = { title: "Members and roles" };

const UPDATED_MESSAGES: Record<string, string> = {
  revoked: "Invitation revoked.",
  role: "Member role updated.",
  status: "Membership status updated.",
  removed: "Member removed from the institution.",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string; joined?: string }>;
}) {
  const context = await requireCapability("manage_members");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return (
      <p className="text-sm text-muted-foreground">
        No active institution is selected.
      </p>
    );
  }

  const query = await searchParams;
  const [members, invitations] = await Promise.all([
    listMembers(institutionId),
    listInvitations(institutionId),
  ]);
  const pending = pendingInvitations(invitations);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/institution"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Members and roles
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {members.length} member{members.length === 1 ? "" : "s"} ·{" "}
          {pending.length} pending invitation{pending.length === 1 ? "" : "s"} in{" "}
          {context.institution?.name ?? "your institution"}.
        </p>
      </div>

      {query.joined && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          You joined the institution. An administrator can adjust your role if
          needed.
        </p>
      )}
      {query.updated && UPDATED_MESSAGES[query.updated] && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
        >
          {UPDATED_MESSAGES[query.updated]}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailPlus className="size-4 text-primary" /> Invite someone
          </CardTitle>
          <CardDescription>
            The invitation creates an account for the invited address. Email is
            sent through Resend when configured; otherwise the link is returned
            once for you to share.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm
            action={inviteMemberAction}
            institutionId={institutionId}
            defaultRole="lecturer"
            roleOptions={INVITABLE_ROLES}
            compact
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4 text-primary" /> Members
          </CardTitle>
          <CardDescription>
            Roles and access are enforced by the database, not just this screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {members.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">
              No members yet. Send the first invitation above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelf = member.userId === context.user.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="pl-4">
                        <span className="text-sm font-medium">
                          {member.fullName}
                        </span>
                        {isSelf && (
                          <Badge variant="secondary" className="ml-2 text-[0.6rem]">
                            You
                          </Badge>
                        )}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <RoleLabel role={member.role} />
                        ) : (
                          <form
                            action={changeMemberRoleAction}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="hidden"
                              name="membershipId"
                              value={member.id}
                            />
                            <select
                              name="role"
                              defaultValue={member.role}
                              className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
                            >
                              {INVITABLE_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {role.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                            <SubmitButton
                              size="xs"
                              variant="ghost"
                              pendingLabel="Saving…"
                            >
                              Save
                            </SubmitButton>
                          </form>
                        )}
                      </TableCell>
                      <TableCell>
                        <MembershipStatusBadge status={member.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {member.acceptedAt
                          ? formatDate(member.acceptedAt)
                          : "Not accepted"}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {!isSelf && (
                          <div className="flex items-center justify-end gap-1.5">
                            <form action={setMemberStatusAction}>
                              <input
                                type="hidden"
                                name="membershipId"
                                value={member.id}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value={
                                  member.status === "suspended"
                                    ? "active"
                                    : "suspended"
                                }
                              />
                              <SubmitButton
                                size="xs"
                                variant="outline"
                                pendingLabel="Saving…"
                              >
                                {member.status === "suspended"
                                  ? "Reactivate"
                                  : "Suspend"}
                              </SubmitButton>
                            </form>
                            <form action={removeMemberAction}>
                              <input
                                type="hidden"
                                name="membershipId"
                                value={member.id}
                              />
                              <SubmitButton
                                size="xs"
                                variant="destructive"
                                pendingLabel="Removing…"
                              >
                                Remove
                              </SubmitButton>
                            </form>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
          <CardDescription>
            Links are single use and expire automatically. Revoke one to let the
            same address be invited again.
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {invitation.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <RoleLabel role={invitation.role} /> · expires{" "}
                      {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                  <form action={revokeInvitationAction}>
                    <input type="hidden" name="invitationId" value={invitation.id} />
                    <SubmitButton
                      size="xs"
                      variant="outline"
                      pendingLabel="Revoking…"
                    >
                      Revoke
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
