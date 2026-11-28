import { redirect } from "next/navigation";
import type { MemberAuthContext } from "@/lib/auth/membership";
import { requireCapability, requireMember } from "@/lib/auth/require";

/**
 * Draft editing and publishing need `manage_timetables`, which covers
 * institution, faculty and department administrators. The database narrows
 * each of them to their own scope, so this guard only decides who sees the
 * editor.
 */
export async function requireTimetableAccess(): Promise<MemberAuthContext> {
  return requireCapability("manage_timetables");
}

/**
 * Personal timetable views. Lecturers and students reach them with
 * `view_own_timetable`; the query filters by the signed-in user's lecturer
 * record or the groups their student record belongs to.
 */
export async function requireTimetableReader(): Promise<MemberAuthContext> {
  const context = await requireMember();
  if (!context.capabilities.includes("view_own_timetable")) {
    redirect("/no-access?reason=forbidden");
  }
  return context;
}
