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
export type BookingStatus = "confirmed" | "cancelled";
export type RoomFeatureCategory = "equipment" | "accessibility" | "layout" | "other";

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

export type StudentStatus = "active" | "graduated" | "withdrawn" | "suspended";
export type LecturerStatus = "active" | "on_leave" | "retired";
export type OfferingStatus = "planned" | "open" | "closed";
export type CalendarEventKind =
  | "holiday"
  | "registration"
  | "teaching"
  | "examination"
  | "deadline"
  | "event";

export type StudentRow = {
  id: string;
  institution_id: string;
  user_id: string | null;
  matric_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  programme_id: string;
  level: number;
  entry_session_id: string | null;
  status: StudentStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LecturerRow = {
  id: string;
  institution_id: string;
  user_id: string | null;
  staff_number: string;
  title: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department_id: string;
  status: LecturerStatus;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentGroupRow = {
  id: string;
  institution_id: string;
  programme_id: string;
  session_id: string;
  level: number;
  name: string;
  code: string;
  expected_size: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentGroupMemberRow = {
  id: string;
  institution_id: string;
  group_id: string;
  student_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseOfferingRow = {
  id: string;
  institution_id: string;
  course_id: string;
  session_id: string;
  semester_id: string;
  coordinator_lecturer_id: string | null;
  expected_size: number | null;
  status: OfferingStatus;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseOfferingLecturerRow = {
  id: string;
  institution_id: string;
  offering_id: string;
  lecturer_id: string;
  role: "lead" | "assistant";
  contact_hours: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseOfferingGroupRow = {
  id: string;
  institution_id: string;
  offering_id: string;
  group_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarEventRow = {
  id: string;
  institution_id: string;
  session_id: string;
  semester_id: string | null;
  title: string;
  description: string | null;
  kind: CalendarEventKind;
  starts_on: string;
  ends_on: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BuildingRow = {
  id: string;
  institution_id: string;
  campus_id: string;
  name: string;
  code: string;
  address: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomRow = {
  id: string;
  institution_id: string;
  building_id: string;
  name: string;
  code: string;
  room_type: RoomType;
  capacity: number;
  floor: string | null;
  accessibility_notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomFeatureRow = {
  id: string;
  institution_id: string;
  name: string;
  category: RoomFeatureCategory;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomFeatureLinkRow = {
  id: string;
  institution_id: string;
  room_id: string;
  feature_id: string;
  quantity: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomAvailabilityRow = {
  id: string;
  institution_id: string;
  room_id: string;
  semester_id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomBookingRow = {
  id: string;
  institution_id: string;
  room_id: string;
  semester_id: string;
  department_id: string | null;
  title: string;
  purpose: string | null;
  starts_at: string;
  ends_at: string;
  expected_attendees: number;
  status: BookingStatus;
  booked_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TimetableStatus = "draft" | "validated" | "published" | "superseded" | "archived";
export type ChangeRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

export type TimetableDraftRow = {
  id: string;
  institution_id: string;
  semester_id: string;
  department_id: string | null;
  faculty_id: string | null;
  title: string;
  status: TimetableStatus;
  created_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TimetableVersionRow = {
  id: string;
  institution_id: string;
  semester_id: string;
  draft_id: string | null;
  version_no: number;
  status: TimetableStatus;
  change_summary: string;
  validation_report: Record<string, unknown>;
  published_at: string;
  published_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TimetableEntryRow = {
  id: string;
  institution_id: string;
  draft_id: string | null;
  version_id: string | null;
  department_id: string | null;
  offering_id: string | null;
  lecturer_id: string | null;
  room_id: string | null;
  group_id: string | null;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  is_fixed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TimetableChangeRequestRow = {
  id: string;
  institution_id: string;
  entry_id: string;
  requested_by: string | null;
  proposed: Record<string, unknown>;
  reason: string;
  status: ChangeRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_version_id: string | null;
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
      students: Table<StudentRow>;
      lecturers: Table<LecturerRow>;
      student_groups: Table<StudentGroupRow>;
      student_group_members: Table<StudentGroupMemberRow>;
      course_offerings: Table<CourseOfferingRow>;
      course_offering_lecturers: Table<CourseOfferingLecturerRow>;
      course_offering_groups: Table<CourseOfferingGroupRow>;
      calendar_events: Table<CalendarEventRow>;
      buildings: Table<BuildingRow>;
      rooms: Table<RoomRow>;
      room_features: Table<RoomFeatureRow>;
      room_feature_links: Table<RoomFeatureLinkRow>;
      room_availability: Table<RoomAvailabilityRow>;
      room_bookings: Table<RoomBookingRow>;
      timetable_drafts: Table<TimetableDraftRow>;
      timetable_versions: Table<TimetableVersionRow>;
      timetable_entries: Table<TimetableEntryRow>;
      timetable_change_requests: Table<TimetableChangeRequestRow>;
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
      student_group_programme: {
        Args: { p_group: string };
        Returns: string | null;
      };
      course_department: { Args: { p_course: string }; Returns: string | null };
      offering_course: { Args: { p_offering: string }; Returns: string | null };
      auth_can_manage_facilities: {
        Args: { p_institution: string };
        Returns: boolean;
      };
      room_capacity: { Args: { p_room: string }; Returns: number | null };
      auth_can_manage_timetables: {
        Args: { p_institution: string; p_department?: string | null; p_faculty?: string | null };
        Returns: boolean;
      };
      publish_timetable_draft: {
        Args: { p_draft_id: string; p_change_summary?: string | null; p_report?: Record<string, unknown> };
        Returns: string;
      };
      archive_timetable_version: { Args: { p_version_id: string }; Returns: undefined };
      duplicate_timetable_draft: {
        Args: { p_draft_id: string; p_semester_id: string; p_title: string };
        Returns: {
          draft_id: string;
          copied: number;
          skipped: { entry: string; reason: string }[];
        };
      };
      submit_timetable_change_request: {
        Args: { p_entry_id: string; p_proposed: Record<string, unknown>; p_reason: string };
        Returns: string;
      };
      review_timetable_change_request: {
        Args: { p_request_id: string; p_approve: boolean; p_note?: string | null };
        Returns: string | null;
      };
    };
    Enums: {
      institution_status: InstitutionStatus;
      membership_role: MembershipRole;
      membership_status: MembershipStatus;
      academic_period_status: AcademicPeriodStatus;
      student_status: StudentStatus;
      lecturer_status: LecturerStatus;
      offering_status: OfferingStatus;
      calendar_event_kind: CalendarEventKind;
      room_type: RoomType;
      booking_status: BookingStatus;
      timetable_status: TimetableStatus;
      change_request_status: ChangeRequestStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
