import type { MembershipRole } from "@/types/database";

export type Capability =
  | "view_institution_dashboard"
  | "manage_institution"
  | "manage_members"
  | "manage_academics"
  | "manage_facilities"
  | "manage_timetables"
  | "publish_timetables"
  | "manage_workload"
  | "view_analytics"
  | "manage_billing"
  | "view_audit"
  | "manage_platform"
  | "use_ai_assistant"
  | "view_own_timetable";

/**
 * Single source of truth for what a role may do. The database enforces the
 * tenant boundary with RLS; this map drives server checks and navigation.
 * Keep it aligned with the permission matrix in docs/03-requirements/PRD.md §2.2.
 */
export const ROLE_CAPABILITIES: Record<MembershipRole, readonly Capability[]> = {
  platform_admin: [
    "manage_platform",
    "view_institution_dashboard",
    "view_analytics",
    "view_audit",
  ],
  support_operator: ["view_analytics", "view_audit"],
  institution_admin: [
    "view_institution_dashboard",
    "manage_institution",
    "manage_members",
    "manage_academics",
    "manage_facilities",
    "manage_timetables",
    "publish_timetables",
    "manage_workload",
    "view_analytics",
    "manage_billing",
    "view_audit",
    "view_own_timetable",
  ],
  faculty_admin: [
    "view_institution_dashboard",
    "manage_academics",
    "manage_facilities",
    "manage_timetables",
    "publish_timetables",
    "manage_workload",
    "view_analytics",
    "view_own_timetable",
  ],
  department_admin: [
    "view_institution_dashboard",
    "manage_academics",
    "manage_timetables",
    "view_analytics",
    "view_own_timetable",
  ],
  lecturer: ["view_own_timetable", "use_ai_assistant"],
  student: ["view_own_timetable", "use_ai_assistant"],
};

export const ROLE_LABELS: Record<MembershipRole, string> = {
  platform_admin: "Platform Super Admin",
  support_operator: "Support Operator",
  institution_admin: "Institution Admin",
  faculty_admin: "Faculty Admin",
  department_admin: "Department Admin",
  lecturer: "Lecturer",
  student: "Student",
};

export function capabilitiesFor(role: MembershipRole): Capability[] {
  return [...ROLE_CAPABILITIES[role]];
}

export function can(
  role: MembershipRole | null | undefined,
  capability: Capability,
): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function landingPathFor(role: MembershipRole): string {
  switch (role) {
    case "platform_admin":
    case "support_operator":
      return "/platform";
    case "lecturer":
      return "/lecturer";
    case "student":
      return "/student";
    default:
      return "/institution";
  }
}
