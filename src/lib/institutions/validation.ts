import {
  INSTITUTION_TYPES,
  INVITABLE_ROLES,
  type InstitutionType,
  type InvitableRole,
} from "@/types/database";

export type FieldErrors = Record<string, string>;

export type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldErrors };

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,59}$/;
const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type InstitutionProfileInput = {
  name: string;
  slug: string;
  type: InstitutionType;
  timezone: string;
  logoUrl: string | null;
  brandPrimary: string | null;
  brandAccent: string | null;
};

export function parseInstitutionProfile(
  formData: FormData,
): Validated<InstitutionProfileInput> {
  const errors: FieldErrors = {};
  const name = text(formData, "name");
  if (name.length < 2 || name.length > 160) {
    errors.name = "Enter an institution name between 2 and 160 characters.";
  }

  const slugInput = text(formData, "slug") || slugify(name);
  if (!SLUG_PATTERN.test(slugInput)) {
    errors.slug =
      "Use 3–60 lowercase letters, numbers and hyphens, starting with a letter or number.";
  }

  const type = text(formData, "type") || "university";
  if (!(INSTITUTION_TYPES as readonly string[]).includes(type)) {
    errors.type = "Choose a supported institution type.";
  }

  const timezone = text(formData, "timezone") || "Africa/Lagos";
  if (timezone.length > 64) {
    errors.timezone = "Use an IANA timezone name such as Africa/Lagos.";
  }

  const logoInput = text(formData, "logoUrl");
  if (logoInput && !/^https?:\/\//i.test(logoInput)) {
    errors.logoUrl = "The logo URL must start with http:// or https://.";
  }

  const brandPrimary = text(formData, "brandPrimary");
  if (brandPrimary && !HEX_COLOUR.test(brandPrimary)) {
    errors.brandPrimary = "Use a six-digit hex colour such as #2563eb.";
  }

  const brandAccent = text(formData, "brandAccent");
  if (brandAccent && !HEX_COLOUR.test(brandAccent)) {
    errors.brandAccent = "Use a six-digit hex colour such as #22d3ee.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      slug: slugInput,
      type: type as InstitutionType,
      timezone,
      logoUrl: logoInput || null,
      brandPrimary: brandPrimary || null,
      brandAccent: brandAccent || null,
    },
  };
}

export type InstitutionSettingsInput = {
  workingDays: number[];
  slotMinutes: number;
  dayStartsAt: string;
  dayEndsAt: string;
  maxContactHours: number;
  allowTeachingInExams: boolean;
};

export function parseInstitutionSettings(
  formData: FormData,
): Validated<InstitutionSettingsInput> {
  const errors: FieldErrors = {};

  const workingDays = formData
    .getAll("workingDays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);

  if (workingDays.length === 0) {
    errors.workingDays = "Choose at least one working day.";
  }

  const slotMinutes = Number(text(formData, "slotMinutes"));
  if (!Number.isInteger(slotMinutes) || slotMinutes < 30 || slotMinutes > 180) {
    errors.slotMinutes = "Slot length must be between 30 and 180 minutes.";
  }

  const dayStartsAt = text(formData, "dayStartsAt");
  const dayEndsAt = text(formData, "dayEndsAt");
  if (!TIME_PATTERN.test(dayStartsAt) || !TIME_PATTERN.test(dayEndsAt)) {
    errors.dayStartsAt = "Use 24-hour times such as 08:00 and 18:00.";
  } else if (dayEndsAt <= dayStartsAt) {
    errors.dayEndsAt = "The teaching day must end after it starts.";
  }

  const maxContactHours = Number(text(formData, "maxContactHours"));
  if (
    !Number.isInteger(maxContactHours) ||
    maxContactHours < 1 ||
    maxContactHours > 60
  ) {
    errors.maxContactHours =
      "Weekly contact-hour limit must be between 1 and 60.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      workingDays: [...new Set(workingDays)].sort(),
      slotMinutes,
      dayStartsAt,
      dayEndsAt,
      maxContactHours,
      allowTeachingInExams: formData.get("allowTeachingInExams") === "on",
    },
  };
}

export type InvitationInput = {
  email: string;
  role: InvitableRole;
  expiresInDays: number;
};

export function parseInvitation(formData: FormData): Validated<InvitationInput> {
  const errors: FieldErrors = {};
  const email = text(formData, "email").toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const role = text(formData, "role");
  if (!(INVITABLE_ROLES as readonly string[]).includes(role)) {
    errors.role = "Choose a role an institution can grant.";
  }

  const expiresInDays = Number(text(formData, "expiresInDays") || "14");
  if (
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > 60
  ) {
    errors.expiresInDays = "Invitations must expire within 1–60 days.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: { email, role: role as InvitableRole, expiresInDays },
  };
}

export function parseMemberRole(
  value: string,
): { ok: true; role: InvitableRole } | { ok: false } {
  if ((INVITABLE_ROLES as readonly string[]).includes(value)) {
    return { ok: true, role: value as InvitableRole };
  }
  return { ok: false };
}
