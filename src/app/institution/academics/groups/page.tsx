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
  getGroupMember,
  getStudentGroup,
  listGroupMembers,
  listStudentGroups,
} from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";

export const metadata: Metadata = { title: "Student groups" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    mpage?: string;
    edit?: string;
    member?: string;
    group?: string;
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
  const memberPage = Number(params.mpage ?? 1) || 1;
  const archived = params.archived === "1";

  const [groups, members, lookups, editingGroup, editingMember] = await Promise.all([
    listStudentGroups(institutionId, { q: params.q, archived, page }),
    listGroupMembers(institutionId, { archived, page: memberPage, groupId: params.group }),
    academicLookups(institutionId),
    params.edit ? getStudentGroup(institutionId, params.edit) : Promise.resolve(null),
    params.member ? getGroupMember(institutionId, params.member) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Student groups</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A group is a cohort: programme, level and session. Membership is
          many-to-many, so a student can sit in a cohort group and a lab group at
          the same time.
        </p>
      </div>

      <AcademicsNav current="group" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editingGroup ? "Edit group" : "Add group"}</CardTitle>
          <CardDescription>
            Group codes are unique in the institution. Several groups may share a
            cohort, e.g. Group A and Group B.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="group" record={editingGroup} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.group.label}</CardTitle>
          <CardDescription>Search by name or code, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar entity="group" q={params.q} archived={archived} total={groups.total} />

          {groups.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived groups." : "No student groups yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="group"
                columns={["Group", "Cohort", "Members", "Expected"]}
                rows={groups.rows.map((group) => ({
                  id: group.id,
                  archived: Boolean(group.archived_at),
                  cells: [
                    <span key="name">
                      <span className="font-mono text-xs text-muted-foreground">{group.code}</span>
                      <span className="mt-0.5 block font-medium">{group.name}</span>
                    </span>,
                    <span key="cohort" className="text-xs text-muted-foreground">
                      {group.programmeCode} · Level {group.level}
                      <span className="mt-0.5 block">{group.sessionName}</span>
                    </span>,
                    <span key="members" className="text-xs tabular-nums">
                      {group.memberCount}
                    </span>,
                    <span key="expected" className="text-xs tabular-nums">
                      {group.expected_size ?? "—"}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.group.path}
                page={groups.page}
                pageCount={groups.pageCount}
                q={params.q}
                archived={archived}
                extraParams={{
                  mpage: memberPage > 1 ? String(memberPage) : undefined,
                  group: params.group,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingMember ? "Edit membership" : "Add a student to a group"}</CardTitle>
          <CardDescription>
            A membership can be archived and restored without touching the
            student&apos;s record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="groupMember" record={editingMember} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.groupMember.label}</CardTitle>
          <CardDescription>
            {members.total} membership{members.total === 1 ? "" : "s"} in this view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-center gap-2">
            {archived && <input type="hidden" name="archived" value="1" />}
            <select name="group" defaultValue={params.group ?? ""} className={selectClass}>
              <option value="">All groups</option>
              {lookups.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.code} — {group.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Filter
            </button>
          </form>

          {members.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived memberships." : "No memberships yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="groupMember"
                editParam="member"
                columns={["Student", "Matriculation", "Level"]}
                rows={members.rows.map((member) => ({
                  id: member.id,
                  archived: Boolean(member.archived_at),
                  cells: [
                    <span key="name" className="font-medium">
                      {member.studentName}
                    </span>,
                    <span key="matric" className="font-mono text-xs text-muted-foreground">
                      {member.matricNumber}
                    </span>,
                    <span key="level" className="text-xs tabular-nums">
                      {member.studentLevel}
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.groupMember.path}
                page={members.page}
                pageCount={members.pageCount}
                archived={archived}
                pageParam="mpage"
                extraParams={{
                  page: page > 1 ? String(page) : undefined,
                  group: params.group,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
