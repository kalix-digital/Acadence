export const APP_NAME = "Acadence";
export const APP_DESCRIPTION =
  "Multi-institution academic scheduling, administration and analytics platform.";

/**
 * Phase 1 placeholder identity. Replaced by the authenticated institution
 * membership resolved in Phase 2 (Supabase Auth + RLS).
 */
export const ACTIVE_CONTEXT = {
  institution: "University of Lagos",
  campus: "Akoka Campus",
  role: "Institution Admin",
  user: {
    name: "Dr. Adaeze Okonkwo",
    email: "a.okonkwo@unilag.edu.ng",
  },
  semester: "2026/2027 · First Semester",
} as const;
