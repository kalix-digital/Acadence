import {
  LECTURER_STATUSES,
  LEVEL_OPTIONS,
  STUDENT_STATUSES,
  type ImportableEntity,
} from "@/lib/academics/constants";

/**
 * CSV import for students and lecturers.
 *
 * The first pass is a dry run: every row is validated against the same rules as
 * the create form plus the institution's existing identifiers, and the caller
 * receives a per-row report. Nothing is written until the second pass, and that
 * pass inserts the whole batch in one statement so a failure leaves no partial
 * import behind.
 */

/** Identifiers present in the file, so the duplicate check reads only those. */
export function identifiersIn(csv: string, entity: ImportableEntity): string[] {
  const table = parseCsv(csv);
  if (table.length < 2) return [];

  const positions = indexHeaders(
    table[0],
    entity === "student" ? STUDENT_HEADERS : LECTURER_HEADERS,
  );
  const field = entity === "student" ? "matric_number" : "staff_number";
  if (positions[field] === undefined) return [];

  const identifiers = table
    .slice(1)
    .map((cells) => cell(cells, positions, field).toUpperCase())
    .filter(Boolean);

  return [...new Set(identifiers)];
}

export type ImportLookups = {
  programmes: { id: string; code: string }[];
  sessions: { id: string; name: string }[];
  departments: { id: string; code: string }[];
};

export type ImportRowReport = {
  line: number;
  label: string;
  errors: string[];
};

export type ImportPreview = {
  entity: ImportableEntity;
  total: number;
  valid: number;
  invalid: number;
  rows: ImportRowReport[];
  /** Problems that stop the file being read at all (header, empty file). */
  fatal: string | null;
};

export type StudentImportPayload = {
  matric_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  programme_id: string;
  level: number;
  entry_session_id: string | null;
  status: string;
};

export type LecturerImportPayload = {
  staff_number: string;
  title: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department_id: string;
  status: string;
};

export type ImportPayload = StudentImportPayload | LecturerImportPayload;

export type ImportResult = {
  preview: ImportPreview;
  payloads: ImportPayload[];
};

/** Form state shared by the import action and its client panel. */
export type ImportState = {
  status: "idle" | "error" | "checked" | "imported";
  message?: string;
  entity?: ImportableEntity;
  /** The validated text, so the commit pass does not need the file again. */
  csv?: string;
  preview?: ImportPreview;
  imported?: number;
};

export const IDLE_IMPORT_STATE: ImportState = { status: "idle" };

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/._-]{1,29}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const STUDENT_HEADERS: Record<string, string[]> = {
  matric_number: ["matric_number", "matric", "matric_no", "matricno", "matriculation_number"],
  first_name: ["first_name", "firstname", "given_name"],
  last_name: ["last_name", "lastname", "surname", "family_name"],
  programme_code: ["programme_code", "programme", "program", "programme code"],
  level: ["level", "study_level"],
  email: ["email", "email_address"],
  phone: ["phone", "phone_number", "mobile"],
  entry_session: ["entry_session", "session", "admission_session"],
  status: ["status"],
};

const LECTURER_HEADERS: Record<string, string[]> = {
  staff_number: ["staff_number", "staff_no", "staffno", "staff_id"],
  first_name: ["first_name", "firstname", "given_name"],
  last_name: ["last_name", "lastname", "surname", "family_name"],
  department_code: ["department_code", "department", "dept"],
  title: ["title", "salutation"],
  email: ["email", "email_address"],
  phone: ["phone", "phone_number", "mobile"],
  status: ["status"],
};

/** RFC 4180-ish reader: quoted fields, escaped quotes, CRLF and a BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  return rows;
}

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function indexHeaders(headers: string[], spec: Record<string, string[]>) {
  const seen = new Map<string, number>();
  headers.forEach((header, index) => seen.set(normaliseHeader(header), index));

  const positions: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(spec)) {
    const match = aliases.map((alias) => seen.get(normaliseHeader(alias))).find((index) => index !== undefined);
    if (match !== undefined) positions[field] = match;
  }
  return positions;
}

function cell(cells: string[], positions: Record<string, number>, field: string) {
  const index = positions[field];
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

function statusOf<T extends string>(value: string, allowed: readonly T[], fallback: T) {
  if (!value) return fallback;
  const normalised = value.trim().toLowerCase().replace(/\s+/g, "_");
  return (allowed as readonly string[]).includes(normalised) ? (normalised as T) : null;
}

function levelOf(value: string) {
  const level = Number(value);
  if (!Number.isInteger(level) || !LEVEL_OPTIONS.includes(level)) return null;
  return level;
}

/**
 * Validates every row and returns the payloads that would be inserted. The
 * preview lists only rows with problems; a clean file reports zero errors.
 */
export function buildImport(params: {
  entity: ImportableEntity;
  csv: string;
  lookups: ImportLookups;
  /** Identifiers already stored, upper-cased (matric or staff numbers). */
  existing: Set<string>;
}): ImportResult {
  const { entity, csv, lookups, existing } = params;
  const table = parseCsv(csv);
  const preview: ImportPreview = {
    entity,
    total: 0,
    valid: 0,
    invalid: 0,
    rows: [],
    fatal: null,
  };

  if (table.length === 0) {
    preview.fatal = "The file is empty. Paste or upload a CSV with a header row.";
    return { preview, payloads: [] };
  }

  const positions =
    entity === "student"
      ? indexHeaders(table[0], STUDENT_HEADERS)
      : indexHeaders(table[0], LECTURER_HEADERS);
  const identifierField = entity === "student" ? "matric_number" : "staff_number";
  const groupField = entity === "student" ? "programme_code" : "department_code";

  const missing = [identifierField, "first_name", "last_name", groupField].filter(
    (field) => positions[field] === undefined,
  );
  if (missing.length > 0) {
    preview.fatal = `The header row is missing: ${missing.join(", ")}.`;
    return { preview, payloads: [] };
  }

  const programmes = new Map(lookups.programmes.map((row) => [row.code.toUpperCase(), row.id]));
  const departments = new Map(lookups.departments.map((row) => [row.code.toUpperCase(), row.id]));
  const sessions = new Map(lookups.sessions.map((row) => [row.name.toUpperCase(), row.id]));

  const seen = new Set<string>();
  const payloads: ImportPayload[] = [];

  for (let index = 1; index < table.length; index += 1) {
    const cells = table[index];
    const line = index + 1;
    const errors: string[] = [];
    const identifier = cell(cells, positions, identifierField).toUpperCase();
    const firstName = cell(cells, positions, "first_name");
    const lastName = cell(cells, positions, "last_name");
    const email = cell(cells, positions, "email").toLowerCase();
    const phone = cell(cells, positions, "phone");
    const label = `${identifier || "row"} — ${[firstName, lastName].filter(Boolean).join(" ")}`.trim();

    if (!IDENTIFIER_PATTERN.test(identifier)) {
      errors.push("Identifier must be 2–30 letters, numbers, dots, slashes or hyphens.");
    } else if (seen.has(identifier)) {
      errors.push("This identifier appears twice in the file.");
    } else if (existing.has(identifier)) {
      errors.push("A record with this identifier already exists.");
    }
    seen.add(identifier);

    if (!firstName) errors.push("First name is required.");
    if (!lastName) errors.push("Last name is required.");
    if (email && !EMAIL_PATTERN.test(email)) errors.push("Email address is not valid.");
    if (phone.length > 32) errors.push("Phone number is too long.");

    if (entity === "student") {
      const programmeCode = cell(cells, positions, "programme_code").toUpperCase();
      const programmeId = programmes.get(programmeCode);
      const level = levelOf(cell(cells, positions, "level"));
      const entrySession = cell(cells, positions, "entry_session");
      const entrySessionId = entrySession ? sessions.get(entrySession.toUpperCase()) ?? null : null;
      const status = statusOf(cell(cells, positions, "status"), STUDENT_STATUSES, "active");

      if (!programmeCode) errors.push("Programme code is required.");
      else if (!programmeId) errors.push(`Unknown programme code "${programmeCode}".`);
      if (level === null) errors.push("Level must be 100–900 in steps of 100.");
      if (entrySession && !entrySessionId) errors.push(`Unknown session "${entrySession}".`);
      if (status === null) errors.push("Status must be active, graduated, withdrawn or suspended.");

      if (errors.length === 0 && programmeId && level !== null && status) {
        payloads.push({
          matric_number: identifier,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: phone || null,
          programme_id: programmeId,
          level,
          entry_session_id: entrySessionId,
          status,
        });
      }
    } else {
      const departmentCode = cell(cells, positions, "department_code").toUpperCase();
      const departmentId = departments.get(departmentCode);
      const title = cell(cells, positions, "title");
      const status = statusOf(cell(cells, positions, "status"), LECTURER_STATUSES, "active");

      if (!departmentCode) errors.push("Department code is required.");
      else if (!departmentId) errors.push(`Unknown department code "${departmentCode}".`);
      if (title.length > 40) errors.push("Title is too long.");
      if (status === null) errors.push("Status must be active, on leave or retired.");

      if (errors.length === 0 && departmentId && status) {
        payloads.push({
          staff_number: identifier,
          title: title || null,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: phone || null,
          department_id: departmentId,
          status,
        });
      }
    }

    preview.total += 1;
    if (errors.length > 0) {
      preview.invalid += 1;
      preview.rows.push({ line, label, errors });
    } else {
      preview.valid += 1;
    }
  }

  return { preview, payloads };
}
