"use client";

import { useActionState } from "react";
import { saveAcademicRecordAction } from "@/app/institution/academics/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import {
  ASSIGNMENT_ROLES,
  CALENDAR_EVENT_KINDS,
  CURRICULUM_REQUIREMENTS,
  LECTURER_STATUSES,
  LEVEL_OPTIONS,
  OFFERING_STATUSES,
  PERIOD_STATUSES,
  PROGRAMME_LEVELS,
  ROOM_TYPES,
  STUDENT_STATUSES,
  labelForValue,
  type AcademicEntity,
} from "@/lib/academics/constants";
import type { AcademicLookups } from "@/lib/academics/data";
import { IDLE_FORM_STATE } from "@/lib/forms";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type RecordValues = Record<string, unknown> | null | undefined;

function str(record: RecordValues, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function num(record: RecordValues, key: string) {
  const value = record?.[key];
  return typeof value === "number" ? value : "";
}

function date(record: RecordValues, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function list(record: RecordValues, key: string) {
  const value = record?.[key];
  return Array.isArray(value) ? value.join(", ") : "";
}

function Field({
  htmlFor,
  label,
  hint,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  id,
  name,
  defaultValue,
  options,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue ?? ""} className={selectClass}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function blocker(entity: AcademicEntity, lookups: AcademicLookups) {
  if ((entity === "department" || entity === "programme" || entity === "course") &&
      lookups.faculties.length === 0) {
    return "Create a faculty first.";
  }
  if ((entity === "department" || entity === "programme" || entity === "course") &&
      lookups.departments.length === 0) {
    return "Create a department first.";
  }
  if (entity === "semester" && lookups.sessions.length === 0) {
    return "Create an academic session first.";
  }
  if (entity === "curriculum" && (lookups.programmes.length === 0 || lookups.courses.length === 0)) {
    return "Create a programme and a course first.";
  }
  if ((entity === "student" || entity === "group") && lookups.programmes.length === 0) {
    return "Create a programme first.";
  }
  if (entity === "student" && lookups.sessions.length === 0) {
    return "Create an academic session first so you can record the entry session.";
  }
  if (entity === "lecturer" && lookups.departments.length === 0) {
    return "Create a department first.";
  }
  if (entity === "groupMember" && (lookups.groups.length === 0 || lookups.students.length === 0)) {
    return "Create a student group and at least one student first.";
  }
  if (
    entity === "offering" &&
    (lookups.courses.length === 0 || lookups.sessions.length === 0 || lookups.semesters.length === 0)
  ) {
    return "Create a course, a session and a semester first.";
  }
  if (entity === "offeringLecturer" && (lookups.offerings.length === 0 || lookups.lecturers.length === 0)) {
    return "Create a course offering and a lecturer first.";
  }
  if (entity === "offeringGroup" && (lookups.offerings.length === 0 || lookups.groups.length === 0)) {
    return "Create a course offering and a student group first.";
  }
  if (entity === "calendarEvent" && lookups.sessions.length === 0) {
    return "Create an academic session first.";
  }
  return null;
}

export function AcademicForm({
  entity,
  record,
  lookups,
}: {
  entity: AcademicEntity;
  record?: RecordValues;
  lookups: AcademicLookups;
}) {
  const [state, formAction] = useActionState(saveAcademicRecordAction, IDLE_FORM_STATE);
  const errors = state.fieldErrors ?? {};
  const blocked = blocker(entity, lookups);
  const id = record && typeof record.id === "string" ? record.id : "";
  const editing = Boolean(id);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="entity" value={entity} />
      {editing && <input type="hidden" name="id" value={id} />}

      {blocked && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {blocked}
        </p>
      )}

      {entity === "campus" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Campus name" error={errors.name}>
            <Input id="name" name="name" defaultValue={str(record, "name")} required className="h-9" />
          </Field>
          <Field htmlFor="code" label="Code" hint="Short code, e.g. MAIN." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field htmlFor="address" label="Address" hint="Optional." error={errors.address}>
              <Input
                id="address"
                name="address"
                defaultValue={str(record, "address")}
                className="h-9"
              />
            </Field>
          </div>
        </div>
      )}

      {entity === "faculty" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Faculty name" error={errors.name}>
            <Input id="name" name="name" defaultValue={str(record, "name")} required className="h-9" />
          </Field>
          <Field htmlFor="code" label="Code" hint="e.g. SCI." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              htmlFor="campusId"
              label="Campus"
              hint="Optional. Leave blank when the faculty is not tied to one site."
              error={errors.campusId}
            >
              <Select
                id="campusId"
                name="campusId"
                defaultValue={str(record, "campus_id")}
                placeholder="No campus (institution-wide)"
                options={lookups.campuses.map((campus) => ({
                  value: campus.id,
                  label: `${campus.name} (${campus.code})`,
                }))}
              />
            </Field>
          </div>
        </div>
      )}

      {entity === "department" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Department name" error={errors.name}>
            <Input id="name" name="name" defaultValue={str(record, "name")} required className="h-9" />
          </Field>
          <Field htmlFor="code" label="Code" hint="e.g. CSC." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field htmlFor="facultyId" label="Faculty" error={errors.facultyId}>
              <Select
                id="facultyId"
                name="facultyId"
                defaultValue={str(record, "faculty_id")}
                placeholder="Choose a faculty"
                options={lookups.faculties.map((faculty) => ({
                  value: faculty.id,
                  label: `${faculty.name} (${faculty.code})`,
                }))}
              />
            </Field>
          </div>
        </div>
      )}

      {entity === "session" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Session name" hint="e.g. 2026/2027." error={errors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={str(record, "name")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="status" label="Status" error={errors.status}>
            <Select
              id="status"
              name="status"
              defaultValue={str(record, "status") || "planned"}
              options={PERIOD_STATUSES.map((status) => ({
                value: status,
                label: labelForValue(status),
              }))}
            />
          </Field>
          <Field htmlFor="startsOn" label="Starts" error={errors.startsOn}>
            <Input
              id="startsOn"
              name="startsOn"
              type="date"
              defaultValue={date(record, "starts_on")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="endsOn" label="Ends" error={errors.endsOn}>
            <Input
              id="endsOn"
              name="endsOn"
              type="date"
              defaultValue={date(record, "ends_on")}
              required
              className="h-9"
            />
          </Field>
        </div>
      )}

      {entity === "semester" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="sessionId" label="Session" error={errors.sessionId}>
            <Select
              id="sessionId"
              name="sessionId"
              defaultValue={str(record, "session_id")}
              placeholder="Choose a session"
              options={lookups.sessions.map((session) => ({
                value: session.id,
                label: session.name,
              }))}
            />
          </Field>
          <Field htmlFor="name" label="Semester name" error={errors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={str(record, "name")}
              placeholder="First Semester"
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="sequence" label="Semester number" error={errors.sequence}>
            <Input
              id="sequence"
              name="sequence"
              type="number"
              min={1}
              max={4}
              defaultValue={num(record, "sequence") || 1}
              className="h-9"
            />
          </Field>
          <Field htmlFor="status" label="Status" error={errors.status}>
            <Select
              id="status"
              name="status"
              defaultValue={str(record, "status") || "planned"}
              options={PERIOD_STATUSES.map((status) => ({
                value: status,
                label: labelForValue(status),
              }))}
            />
          </Field>
          <Field htmlFor="teachingStartsOn" label="Teaching starts" error={errors.teachingStartsOn}>
            <Input
              id="teachingStartsOn"
              name="teachingStartsOn"
              type="date"
              defaultValue={date(record, "teaching_starts_on")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="teachingEndsOn" label="Teaching ends" error={errors.teachingEndsOn}>
            <Input
              id="teachingEndsOn"
              name="teachingEndsOn"
              type="date"
              defaultValue={date(record, "teaching_ends_on")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="examStartsOn" label="Exams start" error={errors.examStartsOn}>
            <Input
              id="examStartsOn"
              name="examStartsOn"
              type="date"
              defaultValue={date(record, "exam_starts_on")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="examEndsOn" label="Exams end" error={errors.examEndsOn}>
            <Input
              id="examEndsOn"
              name="examEndsOn"
              type="date"
              defaultValue={date(record, "exam_ends_on")}
              required
              className="h-9"
            />
          </Field>
        </div>
      )}

      {entity === "programme" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Programme name" error={errors.name}>
            <Input id="name" name="name" defaultValue={str(record, "name")} required className="h-9" />
          </Field>
          <Field htmlFor="code" label="Code" hint="e.g. BSC-CS." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <Field htmlFor="departmentId" label="Department" error={errors.departmentId}>
            <Select
              id="departmentId"
              name="departmentId"
              defaultValue={str(record, "department_id")}
              placeholder="Choose a department"
              options={lookups.departments.map((department) => ({
                value: department.id,
                label: `${department.name} (${department.code})`,
              }))}
            />
          </Field>
          <Field htmlFor="level" label="Level" error={errors.level}>
            <Select
              id="level"
              name="level"
              defaultValue={str(record, "level") || "undergraduate"}
              options={PROGRAMME_LEVELS.map((level) => ({
                value: level,
                label: labelForValue(level),
              }))}
            />
          </Field>
          <Field htmlFor="durationYears" label="Duration (years)" error={errors.durationYears}>
            <Input
              id="durationYears"
              name="durationYears"
              type="number"
              min={1}
              max={8}
              defaultValue={num(record, "duration_years") || 4}
              className="h-9"
            />
          </Field>
        </div>
      )}

      {entity === "course" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="code" label="Course code" hint="e.g. CSC101." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <Field htmlFor="title" label="Course title" error={errors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={str(record, "title")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="departmentId" label="Department" error={errors.departmentId}>
            <Select
              id="departmentId"
              name="departmentId"
              defaultValue={str(record, "department_id")}
              placeholder="Choose a department"
              options={lookups.departments.map((department) => ({
                value: department.id,
                label: `${department.name} (${department.code})`,
              }))}
            />
          </Field>
          <Field htmlFor="level" label="Level" error={errors.level}>
            <Select
              id="level"
              name="level"
              defaultValue={String(num(record, "level") || 100)}
              options={LEVEL_OPTIONS.map((level) => ({ value: String(level), label: String(level) }))}
            />
          </Field>
          <Field htmlFor="units" label="Units" error={errors.units}>
            <Input
              id="units"
              name="units"
              type="number"
              min={1}
              max={12}
              defaultValue={num(record, "units") || 3}
              className="h-9"
            />
          </Field>
          <Field htmlFor="roomType" label="Required room type" error={errors.roomType}>
            <Select
              id="roomType"
              name="roomType"
              defaultValue={str(record, "required_room_type") || "classroom"}
              options={ROOM_TYPES.map((room) => ({
                value: room,
                label: labelForValue(room),
              }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              htmlFor="requiredFeatures"
              label="Required room features"
              hint="Comma separated, e.g. projector, whiteboard."
              error={errors.requiredFeatures}
            >
              <Input
                id="requiredFeatures"
                name="requiredFeatures"
                defaultValue={list(record, "required_features")}
                className="h-9"
              />
            </Field>
          </div>
        </div>
      )}

      {entity === "curriculum" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="programmeId" label="Programme" error={errors.programmeId}>
            <Select
              id="programmeId"
              name="programmeId"
              defaultValue={str(record, "programme_id")}
              placeholder="Choose a programme"
              options={lookups.programmes.map((programme) => ({
                value: programme.id,
                label: `${programme.code} — ${programme.name}`,
              }))}
            />
          </Field>
          <Field htmlFor="courseId" label="Course" error={errors.courseId}>
            <Select
              id="courseId"
              name="courseId"
              defaultValue={str(record, "course_id")}
              placeholder="Choose a course"
              options={lookups.courses.map((course) => ({
                value: course.id,
                label: `${course.code} — ${course.title}`,
              }))}
            />
          </Field>
          <Field htmlFor="level" label="Level" error={errors.level}>
            <Select
              id="level"
              name="level"
              defaultValue={String(num(record, "level") || 100)}
              options={LEVEL_OPTIONS.map((level) => ({ value: String(level), label: String(level) }))}
            />
          </Field>
          <Field htmlFor="requirement" label="Requirement" error={errors.requirement}>
            <Select
              id="requirement"
              name="requirement"
              defaultValue={str(record, "requirement") || "required"}
              options={CURRICULUM_REQUIREMENTS.map((requirement) => ({
                value: requirement,
                label: labelForValue(requirement),
              }))}
            />
          </Field>
        </div>
      )}

      {entity === "student" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="matricNumber"
            label="Matriculation number"
            hint="Unique in the institution, e.g. CSC/2026/001."
            error={errors.matricNumber}
          >
            <Input
              id="matricNumber"
              name="matricNumber"
              defaultValue={str(record, "matric_number")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <Field htmlFor="status" label="Status" error={errors.status}>
            <Select
              id="status"
              name="status"
              defaultValue={str(record, "status") || "active"}
              options={STUDENT_STATUSES.map((status) => ({
                value: status,
                label: labelForValue(status),
              }))}
            />
          </Field>
          <Field htmlFor="firstName" label="First name" error={errors.firstName}>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={str(record, "first_name")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="lastName" label="Last name" error={errors.lastName}>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={str(record, "last_name")}
              required
              className="h-9"
            />
          </Field>
          <Field
            htmlFor="email"
            label="Email"
            hint="Optional. When set, it must be unique in the institution."
            error={errors.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={str(record, "email")}
              className="h-9"
            />
          </Field>
          <Field htmlFor="phone" label="Phone" hint="Optional." error={errors.phone}>
            <Input id="phone" name="phone" defaultValue={str(record, "phone")} className="h-9" />
          </Field>
          <Field htmlFor="programmeId" label="Programme" error={errors.programmeId}>
            <Select
              id="programmeId"
              name="programmeId"
              defaultValue={str(record, "programme_id")}
              placeholder="Choose a programme"
              options={lookups.programmes.map((programme) => ({
                value: programme.id,
                label: `${programme.code} — ${programme.name}`,
              }))}
            />
          </Field>
          <Field htmlFor="level" label="Level" error={errors.level}>
            <Select
              id="level"
              name="level"
              defaultValue={String(num(record, "level") || 100)}
              options={LEVEL_OPTIONS.map((level) => ({ value: String(level), label: String(level) }))}
            />
          </Field>
          <Field
            htmlFor="entrySessionId"
            label="Entry session"
            hint="Optional. The session the student was admitted in."
            error={errors.entrySessionId}
          >
            <Select
              id="entrySessionId"
              name="entrySessionId"
              defaultValue={str(record, "entry_session_id")}
              placeholder="Not recorded"
              options={lookups.sessions.map((session) => ({
                value: session.id,
                label: session.name,
              }))}
            />
          </Field>
        </div>
      )}

      {entity === "lecturer" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="staffNumber"
            label="Staff number"
            hint="Unique in the institution, e.g. STAFF/001."
            error={errors.staffNumber}
          >
            <Input
              id="staffNumber"
              name="staffNumber"
              defaultValue={str(record, "staff_number")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <Field htmlFor="status" label="Status" error={errors.status}>
            <Select
              id="status"
              name="status"
              defaultValue={str(record, "status") || "active"}
              options={LECTURER_STATUSES.map((status) => ({
                value: status,
                label: labelForValue(status),
              }))}
            />
          </Field>
          <Field htmlFor="title" label="Title" hint="Optional, e.g. Dr or Prof." error={errors.title}>
            <Input id="title" name="title" defaultValue={str(record, "title")} className="h-9" />
          </Field>
          <Field htmlFor="departmentId" label="Department" error={errors.departmentId}>
            <Select
              id="departmentId"
              name="departmentId"
              defaultValue={str(record, "department_id")}
              placeholder="Choose a department"
              options={lookups.departments.map((department) => ({
                value: department.id,
                label: `${department.name} (${department.code})`,
              }))}
            />
          </Field>
          <Field htmlFor="firstName" label="First name" error={errors.firstName}>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={str(record, "first_name")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="lastName" label="Last name" error={errors.lastName}>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={str(record, "last_name")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="email" label="Email" hint="Optional." error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={str(record, "email")}
              className="h-9"
            />
          </Field>
          <Field htmlFor="phone" label="Phone" hint="Optional." error={errors.phone}>
            <Input id="phone" name="phone" defaultValue={str(record, "phone")} className="h-9" />
          </Field>
        </div>
      )}

      {entity === "group" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="name" label="Group name" error={errors.name}>
            <Input
              id="name"
              name="name"
              defaultValue={str(record, "name")}
              placeholder="BSc CS 100 — Group A"
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="code" label="Code" hint="e.g. CS-100-A." error={errors.code}>
            <Input
              id="code"
              name="code"
              defaultValue={str(record, "code")}
              required
              className="h-9 font-mono text-sm uppercase"
            />
          </Field>
          <Field htmlFor="programmeId" label="Programme" error={errors.programmeId}>
            <Select
              id="programmeId"
              name="programmeId"
              defaultValue={str(record, "programme_id")}
              placeholder="Choose a programme"
              options={lookups.programmes.map((programme) => ({
                value: programme.id,
                label: `${programme.code} — ${programme.name}`,
              }))}
            />
          </Field>
          <Field htmlFor="sessionId" label="Session" error={errors.sessionId}>
            <Select
              id="sessionId"
              name="sessionId"
              defaultValue={str(record, "session_id")}
              placeholder="Choose a session"
              options={lookups.sessions.map((session) => ({
                value: session.id,
                label: session.name,
              }))}
            />
          </Field>
          <Field htmlFor="level" label="Level" error={errors.level}>
            <Select
              id="level"
              name="level"
              defaultValue={String(num(record, "level") || 100)}
              options={LEVEL_OPTIONS.map((level) => ({ value: String(level), label: String(level) }))}
            />
          </Field>
          <Field
            htmlFor="expectedSize"
            label="Expected size"
            hint="Optional."
            error={errors.expectedSize}
          >
            <Input
              id="expectedSize"
              name="expectedSize"
              type="number"
              min={1}
              max={2000}
              defaultValue={num(record, "expected_size")}
              className="h-9"
            />
          </Field>
        </div>
      )}

      {entity === "groupMember" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="groupId" label="Group" error={errors.groupId}>
            <Select
              id="groupId"
              name="groupId"
              defaultValue={str(record, "group_id")}
              placeholder="Choose a group"
              options={lookups.groups.map((group) => ({
                value: group.id,
                label: `${group.code} — ${group.name} (${group.sessionName})`,
              }))}
            />
          </Field>
          <Field
            htmlFor="studentId"
            label="Student"
            hint="The roster picker lists up to 500 active students by surname."
            error={errors.studentId}
          >
            <Select
              id="studentId"
              name="studentId"
              defaultValue={str(record, "student_id")}
              placeholder="Choose a student"
              options={lookups.students.map((student) => ({
                value: student.id,
                label: `${student.matricNumber} — ${student.name} (${student.programmeCode}, ${student.level})`,
              }))}
            />
          </Field>
        </div>
      )}

      {entity === "offering" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="courseId" label="Course" error={errors.courseId}>
            <Select
              id="courseId"
              name="courseId"
              defaultValue={str(record, "course_id")}
              placeholder="Choose a course"
              options={lookups.courses.map((course) => ({
                value: course.id,
                label: `${course.code} — ${course.title}`,
              }))}
            />
          </Field>
          <Field htmlFor="status" label="Status" error={errors.status}>
            <Select
              id="status"
              name="status"
              defaultValue={str(record, "status") || "planned"}
              options={OFFERING_STATUSES.map((status) => ({
                value: status,
                label: labelForValue(status),
              }))}
            />
          </Field>
          <Field htmlFor="sessionId" label="Session" error={errors.sessionId}>
            <Select
              id="sessionId"
              name="sessionId"
              defaultValue={str(record, "session_id")}
              placeholder="Choose a session"
              options={lookups.sessions.map((session) => ({
                value: session.id,
                label: session.name,
              }))}
            />
          </Field>
          <Field
            htmlFor="semesterId"
            label="Semester"
            hint="Must belong to the session chosen above."
            error={errors.semesterId}
          >
            <Select
              id="semesterId"
              name="semesterId"
              defaultValue={str(record, "semester_id")}
              placeholder="Choose a semester"
              options={lookups.semesters.map((semester) => ({
                value: semester.id,
                label: `${semester.sessionName} · ${semester.sequence}. ${semester.name}`,
              }))}
            />
          </Field>
          <Field
            htmlFor="coordinatorLecturerId"
            label="Coordinator"
            hint="Optional. Lecturers are assigned separately below."
            error={errors.coordinatorLecturerId}
          >
            <Select
              id="coordinatorLecturerId"
              name="coordinatorLecturerId"
              defaultValue={str(record, "coordinator_lecturer_id")}
              placeholder="No coordinator yet"
              options={lookups.lecturers.map((lecturer) => ({
                value: lecturer.id,
                label: `${lecturer.name} (${lecturer.staffNumber})`,
              }))}
            />
          </Field>
          <Field
            htmlFor="expectedSize"
            label="Expected size"
            hint="Optional."
            error={errors.expectedSize}
          >
            <Input
              id="expectedSize"
              name="expectedSize"
              type="number"
              min={1}
              max={2000}
              defaultValue={num(record, "expected_size")}
              className="h-9"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field htmlFor="notes" label="Notes" hint="Optional." error={errors.notes}>
              <Input id="notes" name="notes" defaultValue={str(record, "notes")} className="h-9" />
            </Field>
          </div>
        </div>
      )}

      {entity === "offeringLecturer" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="offeringId" label="Offering" error={errors.offeringId}>
            <Select
              id="offeringId"
              name="offeringId"
              defaultValue={str(record, "offering_id")}
              placeholder="Choose an offering"
              options={lookups.offerings.map((offering) => ({
                value: offering.id,
                label: offering.label,
              }))}
            />
          </Field>
          <Field htmlFor="lecturerId" label="Lecturer" error={errors.lecturerId}>
            <Select
              id="lecturerId"
              name="lecturerId"
              defaultValue={str(record, "lecturer_id")}
              placeholder="Choose a lecturer"
              options={lookups.lecturers.map((lecturer) => ({
                value: lecturer.id,
                label: `${lecturer.name} (${lecturer.departmentName})`,
              }))}
            />
          </Field>
          <Field htmlFor="role" label="Role" error={errors.role}>
            <Select
              id="role"
              name="role"
              defaultValue={str(record, "role") || "lead"}
              options={ASSIGNMENT_ROLES.map((role) => ({
                value: role,
                label: labelForValue(role),
              }))}
            />
          </Field>
          <Field
            htmlFor="contactHours"
            label="Contact hours"
            hint="Optional, per week."
            error={errors.contactHours}
          >
            <Input
              id="contactHours"
              name="contactHours"
              type="number"
              step="0.5"
              min={0}
              max={200}
              defaultValue={num(record, "contact_hours")}
              className="h-9"
            />
          </Field>
        </div>
      )}

      {entity === "offeringGroup" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="offeringId" label="Offering" error={errors.offeringId}>
            <Select
              id="offeringId"
              name="offeringId"
              defaultValue={str(record, "offering_id")}
              placeholder="Choose an offering"
              options={lookups.offerings.map((offering) => ({
                value: offering.id,
                label: offering.label,
              }))}
            />
          </Field>
          <Field htmlFor="groupId" label="Student group" error={errors.groupId}>
            <Select
              id="groupId"
              name="groupId"
              defaultValue={str(record, "group_id")}
              placeholder="Choose a group"
              options={lookups.groups.map((group) => ({
                value: group.id,
                label: `${group.code} — ${group.name}`,
              }))}
            />
          </Field>
        </div>
      )}

      {entity === "calendarEvent" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="title" label="Event title" error={errors.title}>
            <Input
              id="title"
              name="title"
              defaultValue={str(record, "title")}
              placeholder="Mid-semester break"
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="kind" label="Kind" error={errors.kind}>
            <Select
              id="kind"
              name="kind"
              defaultValue={str(record, "kind") || "event"}
              options={CALENDAR_EVENT_KINDS.map((kind) => ({
                value: kind,
                label: labelForValue(kind),
              }))}
            />
          </Field>
          <Field htmlFor="sessionId" label="Session" error={errors.sessionId}>
            <Select
              id="sessionId"
              name="sessionId"
              defaultValue={str(record, "session_id")}
              placeholder="Choose a session"
              options={lookups.sessions.map((session) => ({
                value: session.id,
                label: session.name,
              }))}
            />
          </Field>
          <Field
            htmlFor="semesterId"
            label="Semester"
            hint="Optional. Leave blank for an event covering the whole session."
            error={errors.semesterId}
          >
            <Select
              id="semesterId"
              name="semesterId"
              defaultValue={str(record, "semester_id")}
              placeholder="Whole session"
              options={lookups.semesters.map((semester) => ({
                value: semester.id,
                label: `${semester.sessionName} · ${semester.sequence}. ${semester.name}`,
              }))}
            />
          </Field>
          <Field htmlFor="startsOn" label="Starts" error={errors.startsOn}>
            <Input
              id="startsOn"
              name="startsOn"
              type="date"
              defaultValue={date(record, "starts_on")}
              required
              className="h-9"
            />
          </Field>
          <Field htmlFor="endsOn" label="Ends" error={errors.endsOn}>
            <Input
              id="endsOn"
              name="endsOn"
              type="date"
              defaultValue={date(record, "ends_on")}
              required
              className="h-9"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field htmlFor="description" label="Description" hint="Optional." error={errors.description}>
              <Input
                id="description"
                name="description"
                defaultValue={str(record, "description")}
                className="h-9"
              />
            </Field>
          </div>
        </div>
      )}

      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Saving…" disabled={Boolean(blocked)}>
          {editing ? "Save changes" : "Add record"}
        </SubmitButton>
        {editing && (
          <a
            href="?"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Cancel
          </a>
        )}
      </div>
    </form>
  );
}
