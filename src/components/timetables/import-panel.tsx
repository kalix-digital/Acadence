"use client";

import { useActionState } from "react";
import { importTimetableEntriesAction } from "@/app/institution/timetables/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import {
  IDLE_TIMETABLE_IMPORT,
  TIMETABLE_IMPORT_COLUMNS,
} from "@/lib/timetables/import";

export function TimetableImportPanel({ draftId }: { draftId: string }) {
  const [state, checkAction] = useActionState(
    importTimetableEntriesAction,
    IDLE_TIMETABLE_IMPORT,
  );
  const [commitState, commitAction] = useActionState(
    importTimetableEntriesAction,
    IDLE_TIMETABLE_IMPORT,
  );
  const current = commitState.status === "imported" ? commitState : state;
  const preview = current.preview;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Columns: <span className="font-mono">{TIMETABLE_IMPORT_COLUMNS.join(", ")}</span>. Rows are
        matched by course code, staff number and room/group code; a row without a course code
        becomes a fixed entry using its notes as the label.
      </p>

      {current.message && (
        <p
          role={current.status === "error" ? "alert" : "status"}
          className={
            current.status === "error"
              ? "rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
          }
        >
          {current.message}
        </p>
      )}

      {preview && preview.rows.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2 text-xs">
          {preview.rows.map((row) => (
            <li key={row.line}>
              <span className="font-medium">Line {row.line}</span> · {row.label}
              <span className="mt-0.5 block text-destructive">{row.errors.join(" ")}</span>
            </li>
          ))}
        </ul>
      )}

      <form action={checkAction} className="space-y-2">
        <input type="hidden" name="draftId" value={draftId} />
        <input type="hidden" name="mode" value="check" />
        <textarea
          name="csv"
          rows={6}
          defaultValue={state.csv ?? ""}
          placeholder={`course_code,day,start_time,end_time,lecturer_staff_number,room_code,group_code,notes
CSC101,Monday,09:00,11:00,T-100,HALL-T,CS-100,`}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <button
          type="submit"
          className="h-8 rounded-lg border border-border/70 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Check rows
        </button>
      </form>

      {state.csv && (
        <form action={commitAction} className="space-y-2">
          <input type="hidden" name="draftId" value={draftId} />
          <input type="hidden" name="mode" value="commit" />
          <input type="hidden" name="csv" value={state.csv} />
          <SubmitButton>Import all rows</SubmitButton>
          <p className="text-xs text-muted-foreground">
            Nothing is written until this step, and one bad row imports nothing.
          </p>
        </form>
      )}
    </div>
  );
}
