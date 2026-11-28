"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { moveTimetableEntryAction } from "@/app/institution/timetables/actions";
import {
  entryColour,
  formatSlot,
  minutesOf,
  weekdayLabel,
} from "@/lib/timetables/constants";
import { buildSlots, slotSpan, workingDays, type GridSettings } from "@/lib/timetables/grid";

export type GridEntry = {
  id: string;
  label: string;
  detail: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  seed: string | null;
};

function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * The week grid (OQ-035). Dragging an entry to another cell moves it and keeps
 * its duration; clicking it opens the form, so every move is also possible
 * without a pointer gesture.
 */
export function TimetableGrid({
  entries,
  settings,
  editable = false,
  selectedId,
  emptyText,
}: {
  entries: GridEntry[];
  settings: GridSettings;
  editable?: boolean;
  selectedId?: string | null;
  emptyText?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const slots = buildSlots(settings);
  const days = workingDays(settings);
  const visible = entries.filter((entry) => days.includes(entry.dayOfWeek));
  const hidden = entries.filter((entry) => !days.includes(entry.dayOfWeek));

  if (slots.length === 0 || days.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Set the institution&apos;s working days and teaching hours in settings before
        laying out a grid.
      </p>
    );
  }

  function move(entryId: string, dayOfWeek: number, slotStart: number) {
    const entry = entries.find((row) => row.id === entryId);
    if (!entry) return;

    const duration = minutesOf(entry.endsAt) - minutesOf(entry.startsAt);
    const end = Math.min(slotStart + Math.max(15, duration), minutesOf(settings.day_ends_at));
    if (end <= slotStart) {
      setMessage("That entry does not fit before the end of the teaching day.");
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await moveTimetableEntryAction({
        entryId,
        dayOfWeek,
        startsAt: clock(slotStart),
        endsAt: clock(end),
      });
      if (!result.ok) {
        setMessage(result.message ?? "The entry could not be moved.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {message && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
        >
          {message}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <div
          className="grid min-w-[720px] gap-px bg-border/60 p-px"
          style={{
            gridTemplateColumns: `72px repeat(${days.length}, minmax(150px, 1fr))`,
            gridAutoRows: "64px",
          }}
        >
          <div className="bg-card px-2 py-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            Time
          </div>
          {days.map((day) => (
            <div
              key={`head-${day}`}
              className="bg-card px-2 py-2 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {weekdayLabel(day)}
            </div>
          ))}

          {slots.map((slot, slotIndex) => (
            <div
              key={`time-${slot.start}`}
              className="bg-card px-2 py-1 text-[0.65rem] tabular-nums text-muted-foreground"
              style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
            >
              {slot.start}
            </div>
          ))}

          {slots.map((slot, slotIndex) =>
            days.map((day, dayIndex) => (
              <div
                key={`cell-${day}-${slot.start}`}
                className="bg-card/60"
                style={{ gridColumn: dayIndex + 2, gridRow: slotIndex + 2 }}
                onDragOver={(event) => {
                  if (!editable) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (!editable) return;
                  event.preventDefault();
                  const entryId = event.dataTransfer.getData("text/timetable-entry");
                  setDragging(null);
                  if (entryId) move(entryId, day, slot.minutes);
                }}
              />
            )),
          )}

          {visible.map((entry) => {
            const dayIndex = days.indexOf(entry.dayOfWeek);
            const { index, span } = slotSpan(
              { starts_at: entry.startsAt, ends_at: entry.endsAt },
              slots,
            );
            const selected = selectedId === entry.id;

            return (
              <div
                key={entry.id}
                className={`m-0.5 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition-opacity ${entryColour(
                  entry.seed,
                )} ${selected ? "ring-2 ring-primary" : ""} ${
                  dragging === entry.id ? "opacity-50" : ""
                } ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: `${index + 2} / span ${span}`,
                  zIndex: 1,
                }}
                draggable={editable}
                onDragStart={(event) => {
                  if (!editable) return;
                  event.dataTransfer.setData("text/timetable-entry", entry.id);
                  event.dataTransfer.effectAllowed = "move";
                  setDragging(entry.id);
                }}
                onDragEnd={() => setDragging(null)}
                onClick={() => {
                  if (!editable) return;
                  router.push(`${pathname}?entry=${entry.id}`);
                }}
                onKeyDown={(event) => {
                  if (!editable) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`${pathname}?entry=${entry.id}`);
                  }
                }}
                role={editable ? "button" : undefined}
                tabIndex={editable ? 0 : undefined}
                title={`${entry.label} · ${formatSlot(entry.startsAt, entry.endsAt)}`}
              >
                <p className="truncate text-[0.7rem] font-semibold leading-tight">{entry.label}</p>
                <p className="truncate text-[0.62rem] opacity-80">
                  {formatSlot(entry.startsAt, entry.endsAt)}
                </p>
                <p className="truncate text-[0.62rem] opacity-80">{entry.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {entries.length === 0 && emptyText && (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      )}

      {hidden.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-300">
          {hidden.length} entr{hidden.length === 1 ? "y is" : "ies are"} on a day outside the
          institution&apos;s working week:{" "}
          {hidden.map((entry) => weekdayLabel(entry.dayOfWeek)).join(", ")}. Publishing will
          refuse them until the day is enabled or the entries move.
        </p>
      )}

      {pending && <p className="text-xs text-muted-foreground">Saving the move…</p>}
    </div>
  );
}
