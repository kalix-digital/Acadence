"use client";

import { useActionState } from "react";
import { importRecordsAction } from "@/app/institution/academics/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LECTURER_IMPORT_COLUMNS,
  STUDENT_IMPORT_COLUMNS,
  type ImportableEntity,
} from "@/lib/academics/constants";
import { IDLE_IMPORT_STATE } from "@/lib/academics/import";

/**
 * Import is deliberately two steps. The first pass validates every row and
 * writes nothing; the second inserts the whole batch or nothing at all, so a
 * file with one bad row never leaves a half-loaded roster behind.
 */
export function ImportPanel({ entity }: { entity: ImportableEntity }) {
  const [state, formAction] = useActionState(importRecordsAction, IDLE_IMPORT_STATE);
  const columns = entity === "student" ? STUDENT_IMPORT_COLUMNS : LECTURER_IMPORT_COLUMNS;
  const noun = entity === "student" ? "students" : "lecturers";
  const preview = state.preview;
  const checked = state.status === "checked" && preview && preview.valid > 0;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="entity" value={entity} />
      {state.csv && <input type="hidden" name="csv" value={state.csv} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${entity}-file`} className="text-sm font-medium">
            CSV file
          </label>
          <Input
            id={`${entity}-file`}
            name="file"
            type="file"
            accept=".csv,text/csv"
            className="h-9 file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Header row required:{" "}
            <span className="font-mono">{columns.join(", ")}</span>. Only the
            identifier, names and{" "}
            {entity === "student" ? "programme code and level" : "department code"}{" "}
            are mandatory.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${entity}-paste`} className="text-sm font-medium">
            Or paste CSV
          </label>
          <textarea
            id={`${entity}-paste`}
            name="csv"
            defaultValue={state.csv ?? ""}
            rows={4}
            placeholder={columns.join(",")}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>
      </div>

      {state.message && (
        <p
          role="status"
          className={
            state.status === "imported"
              ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
              : state.status === "checked"
                ? "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
                : "rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      )}

      {preview && (
        <div className="space-y-3 rounded-xl border border-border/70 px-3 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span>
              <span className="font-medium tabular-nums">{preview.total}</span> rows
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              <span className="font-medium tabular-nums">{preview.valid}</span> ready
            </span>
            <span className={preview.invalid > 0 ? "text-destructive" : "text-muted-foreground"}>
              <span className="font-medium tabular-nums">{preview.invalid}</span> with problems
            </span>
          </div>

          {preview.rows.length > 0 && (
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Line</th>
                    <th className="py-1 pr-3 font-medium">Row</th>
                    <th className="py-1 font-medium">Problems</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 100).map((row) => (
                    <tr key={row.line} className="border-t border-border/50 align-top">
                      <td className="py-1.5 pr-3 tabular-nums">{row.line}</td>
                      <td className="py-1.5 pr-3">{row.label}</td>
                      <td className="py-1.5 text-destructive">{row.errors.join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 100 && (
                <p className="mt-1 text-[0.7rem] text-muted-foreground">
                  Showing the first 100 problems.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" name="mode" value="dry" size="sm" variant="outline">
          Check file
        </Button>
        {checked && (
          <Button type="submit" name="mode" value="commit" size="sm">
            Import {preview.valid} {noun}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          Nothing is written until you import, and a file with any problem
          imports nothing.
        </span>
      </div>
    </form>
  );
}
