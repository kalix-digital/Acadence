import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/capabilities";
import type {
  InstitutionStatus,
  MembershipRole,
  MembershipStatus,
} from "@/types/database";

const STATUS_CLASS: Record<string, string> = {
  active:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  suspended:
    "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  archived: "border-border bg-muted text-muted-foreground",
  invited: "border-chart-5/30 bg-chart-5/10 text-chart-5",
  revoked: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function InstitutionStatusBadge({
  status,
}: {
  status: InstitutionStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? ""}>
      {status}
    </Badge>
  );
}

export function MembershipStatusBadge({
  status,
}: {
  status: MembershipStatus;
}) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status] ?? ""}>
      {status}
    </Badge>
  );
}

export function RoleLabel({ role }: { role: MembershipRole }) {
  return <span className="text-sm">{ROLE_LABELS[role]}</span>;
}
