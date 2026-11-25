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
    };
    Enums: {
      institution_status: InstitutionStatus;
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
