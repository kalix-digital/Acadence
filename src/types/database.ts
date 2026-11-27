/**
 * Handwritten subset of the Supabase schema for Phase 2–3 tables.
 * Replace with `supabase gen types typescript` output as later phases add tables.
 */
export type InstitutionStatus = "pending" | "active" | "suspended" | "archived";
export type MembershipStatus = "invited" | "active" | "suspended" | "revoked";
export type MembershipRole =
  | "platform_admin"
  | "support_operator"
  | "institution_admin"
  | "faculty_admin"
  | "department_admin"
  | "lecturer"
  | "student";

/** Roles an institution may grant through an invitation. */
export const INVITABLE_ROLES = [
  "institution_admin",
  "faculty_admin",
  "department_admin",
  "lecturer",
  "student",
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const INSTITUTION_TYPES = [
  "university",
  "polytechnic",
  "college",
  "institute",
  "other",
] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export type InstitutionRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: InstitutionStatus;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type MembershipRow = {
  id: string;
  institution_id: string | null;
  user_id: string;
  role: MembershipRole;
  faculty_id: string | null;
  department_id: string | null;
  status: MembershipStatus;
  invited_email: string | null;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InstitutionSettingsRow = {
  institution_id: string;
  working_days: number[];
  slot_minutes: number;
  day_starts_at: string;
  day_ends_at: string;
  default_max_contact_hours: number;
  allow_teaching_in_exams: boolean;
  created_at: string;
  updated_at: string;
};

export type InstitutionInvitationRow = {
  id: string;
  institution_id: string;
  email: string;
  role: MembershipRole;
  faculty_id: string | null;
  department_id: string | null;
  token_hash: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InstitutionActivityRow = {
  id: number;
  institution_id: string | null;
  actor_id: string | null;
  action: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type InvitationPreview = {
  institution_id: string;
  institution_name: string;
  email: string;
  role: MembershipRole;
  state: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
};

export type AcademicPeriodStatus = "planned" | "active" | "closed";
export type ProgrammeLevel =
  | "undergraduate"
  | "postgraduate"
  | "diploma"
  | "certificate";
export type RoomType =
  | "classroom"
  | "lecture_hall"
  | "laboratory"
  | "studio"
  | "seminar";
export type CurriculumRequirement = "required" | "elective";

export type CampusRow = {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  address: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FacultyRow = {
  id: string;
  institution_id: string;
  campus_id: string | null;
  name: string;
  code: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DepartmentRow = {
  id: string;
  institution_id: string;
  faculty_id: string;
  name: string;
  code: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AcademicSessionRow = {
  id: string;
  institution_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status: AcademicPeriodStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SemesterRow = {
  id: string;
  institution_id: string;
  session_id: string;
  name: string;
  sequence: number;
  teaching_starts_on: string;
  teaching_ends_on: string;
  exam_starts_on: string;
  exam_ends_on: string;
  status: AcademicPeriodStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgrammeRow = {
  id: string;
  institution_id: string;
  department_id: string;
  code: string;
  name: string;
  level: ProgrammeLevel;
  duration_years: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseRow = {
  id: string;
  institution_id: string;
  department_id: string;
  code: string;
  title: string;
  units: number;
  level: number;
  required_room_type: RoomType;
  required_features: string[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgrammeCourseRow = {
  id: string;
  institution_id: string;
  programme_id: string;
  course_id: string;
  level: number;
  requirement: CurriculumRequirement;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      institutions: Table<InstitutionRow>;
      institution_settings: Table<InstitutionSettingsRow>;
      profiles: Table<ProfileRow>;
      institution_memberships: Table<MembershipRow>;
      institution_invitations: Table<InstitutionInvitationRow>;
      institution_activity: Table<InstitutionActivityRow>;
      campuses: Table<CampusRow>;
      faculties: Table<FacultyRow>;
      departments: Table<DepartmentRow>;
      academic_sessions: Table<AcademicSessionRow>;
      semesters: Table<SemesterRow>;
      programmes: Table<ProgrammeRow>;
      courses: Table<CourseRow>;
      programme_courses: Table<ProgrammeCourseRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_platform_admin: { Args: Record<string, never>; Returns: boolean };
      auth_institution_ids: { Args: Record<string, never>; Returns: string[] };
      auth_role: { Args: { p_institution: string }; Returns: MembershipRole | null };
      accept_invitation: {
        Args: { p_membership_id: string };
        Returns: MembershipStatus;
      };
      create_invitation: {
        Args: {
          p_institution: string;
          p_email: string;
          p_role: MembershipRole;
          p_expires_in_days?: number;
        };
        Returns: string;
      };
      invitation_preview: {
        Args: { p_token: string };
        Returns: InvitationPreview[];
      };
      accept_invitation_token: {
        Args: { p_token: string };
        Returns: string;
      };
      can_manage_academic_unit: {
        Args: {
          p_institution: string;
          p_faculty?: string | null;
          p_department?: string | null;
        };
        Returns: boolean;
      };
      auth_faculty_ids: {
        Args: { p_institution: string };
        Returns: string[];
      };
      department_faculty: { Args: { p_department: string }; Returns: string | null };
      programme_department: {
        Args: { p_programme: string };
        Returns: string | null;
      };
    };
    Enums: {
      institution_status: InstitutionStatus;
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      academic_period_status: AcademicPeriodStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
