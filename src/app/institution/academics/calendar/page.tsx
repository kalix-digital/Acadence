import type { Metadata } from "next";
import { AcademicForm } from "@/components/academics/forms";
import { AcademicsBackLink, AcademicsNav } from "@/components/academics/shell";
import {
  AcademicFlash,
  AcademicPagination,
  AcademicTable,
  AcademicToolbar,
} from "@/components/academics/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { teachingWeeks, countTeachingWeeks } from "@/lib/academics/calendar";
import { ACADEMIC_ENTITIES, labelForValue } from "@/lib/academics/constants";
import {
  academicLookups,
  getCalendarEvent,
  getSemester,
  listCalendarEvents,
  sessionCalendarEvents,
} from "@/lib/academics/data";
import { requireCapability } from "@/lib/auth/require";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Academic calendar" };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
    session?: string;
    semester?: string;
    edit?: string;
    updated?: string;
    error?: string;
  }>;
}) {
  const context = await requireCapability("manage_academics");
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const archived = params.archived === "1";

  const [events, lookups, editing] = await Promise.all([
    listCalendarEvents(institutionId, {
      q: params.q,
      archived,
      page,
      sessionId: params.session,
    }),
    academicLookups(institutionId),
    params.edit ? getCalendarEvent(institutionId, params.edit) : Promise.resolve(null),
  ]);

  const semesterId = params.semester ?? lookups.semesters[0]?.id;
  const semester = semesterId ? await getSemester(institutionId, semesterId) : null;
  const semesterEvents = semester ? await sessionCalendarEvents(institutionId, semester.session_id) : [];
  const weeks = semester ? teachingWeeks(semester, semesterEvents) : [];
  const teaching = countTeachingWeeks(weeks);

  return (
    <div className="space-y-5">
      <div>
        <AcademicsBackLink />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Academic calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Events belong to a session and may be narrowed to one semester.
          Teaching weeks are derived from the semester&apos;s teaching window and
          the holidays covering it — they are never stored.
        </p>
      </div>

      <AcademicsNav current="calendarEvent" />
      <AcademicFlash updated={params.updated} error={params.error} />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit event" : "Add event"}</CardTitle>
          <CardDescription>
            Holidays, registration windows, examination periods, deadlines and
            general events all live here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcademicForm entity="calendarEvent" record={editing} lookups={lookups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ACADEMIC_ENTITIES.calendarEvent.label}</CardTitle>
          <CardDescription>Search by title, filter by session, then edit or archive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AcademicToolbar
            entity="calendarEvent"
            q={params.q}
            archived={archived}
            total={events.total}
          />

          <form className="flex flex-wrap items-center gap-2">
            {params.q && <input type="hidden" name="q" value={params.q} />}
            {archived && <input type="hidden" name="archived" value="1" />}
            <select name="session" defaultValue={params.session ?? ""} className={selectClass}>
              <option value="">All sessions</option>
              {lookups.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Apply filter
            </button>
          </form>

          {events.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              {archived ? "No archived events." : "No calendar events yet."}
            </p>
          ) : (
            <div className="space-y-4">
              <AcademicTable
                entity="calendarEvent"
                columns={["Event", "Kind", "Dates", "Session"]}
                rows={events.rows.map((event) => ({
                  id: event.id,
                  archived: Boolean(event.archived_at),
                  cells: [
                    <span key="title">
                      <span className="font-medium">{event.title}</span>
                      {event.description && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {event.description}
                        </span>
                      )}
                    </span>,
                    <span key="kind" className="text-xs">
                      {labelForValue(event.kind)}
                    </span>,
                    <span key="dates" className="text-xs text-muted-foreground">
                      {formatDate(event.starts_on)} – {formatDate(event.ends_on)}
                    </span>,
                    <span key="session" className="text-xs text-muted-foreground">
                      {event.sessionName}
                      <span className="mt-0.5 block">{event.semesterName ?? "Whole session"}</span>
                    </span>,
                  ],
                }))}
              />
              <AcademicPagination
                basePath={ACADEMIC_ENTITIES.calendarEvent.path}
                page={events.page}
                pageCount={events.pageCount}
                q={params.q}
                archived={archived}
                extraParams={{ session: params.session, semester: params.semester }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teaching weeks</CardTitle>
          <CardDescription>
            Derived from the chosen semester&apos;s teaching dates. A week covered
            by a holiday event is not counted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap items-center gap-2">
            <select name="semester" defaultValue={semesterId ?? ""} className={selectClass}>
              {lookups.semesters.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.sessionName} · {option.sequence}. {option.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Show weeks
            </button>
          </form>

          {!semester ? (
            <p className="text-sm text-muted-foreground">
              Create a semester to derive its teaching weeks.
            </p>
          ) : weeks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This semester has no teaching window recorded.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {teaching} teaching week{teaching === 1 ? "" : "s"} out of{" "}
                {weeks.length} in {semester.name}.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {weeks.map((week) => (
                  <div
                    key={week.index}
                    className={
                      week.holiday
                        ? "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                        : "rounded-xl border border-border/70 px-3 py-2"
                    }
                  >
                    <p className="text-xs font-medium tabular-nums">
                      Week {week.index}
                      {week.holiday && (
                        <span className="ml-1.5 font-normal text-amber-700 dark:text-amber-300">
                          · {week.holiday}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(week.startsOn)} – {formatDate(week.endsOn)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
