/**
 * Handwritten subset of the Supabase schema for Phase 2 tables.
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
    };
    Views: Record<string, never>;
    Functions: {
      is_platform_admin: { Args: Record<string, never>; Returns: boolean };
      auth_institution_ids: { Args: Record<string, never>; Returns: string[] };
      auth_role: { Args: { p_institution: string }; Returns: MembershipRole | null };
    };
    Enums: {
      institution_status: InstitutionStatus;
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
