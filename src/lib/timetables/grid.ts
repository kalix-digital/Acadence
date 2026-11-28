import { minutesOf } from "@/lib/timetables/constants";

export type GridSettings = {
  working_days: number[];
  slot_minutes: number;
  day_starts_at: string;
  day_ends_at: string;
};

export type GridSlot = {
  /** Minutes from midnight. */
  minutes: number;
  start: string;
  end: string;
};

function clock(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * The editable rows of the grid: the institution's working day sliced into its
 * configured slot length. Entries keep their real times, so a 09:30–10:30
 * class spans two 60-minute rows rather than being snapped.
 */
export function buildSlots(settings: GridSettings): GridSlot[] {
  const start = minutesOf(settings.day_starts_at);
  const end = minutesOf(settings.day_ends_at);
  const size = Math.max(15, settings.slot_minutes || 60);
  const slots: GridSlot[] = [];

  for (let cursor = start; cursor < end; cursor += size) {
    slots.push({ minutes: cursor, start: clock(cursor), end: clock(Math.min(cursor + size, end)) });
  }

  return slots;
}

export function workingDays(settings: GridSettings) {
  return [1, 2, 3, 4, 5, 6, 7].filter((day) => settings.working_days.includes(day));
}

/**
 * Where an entry sits in the grid, in slot rows. Entries outside the working
 * day are still returned with a clamped position so nothing disappears from
 * the grid; publishing reports them separately.
 */
export function slotSpan(
  entry: { starts_at: string; ends_at: string },
  slots: GridSlot[],
) {
  if (slots.length === 0) return { index: 0, span: 1 };
  const start = minutesOf(entry.starts_at);
  const end = Math.max(start + 15, minutesOf(entry.ends_at));
  const size = slots[1] ? slots[1].minutes - slots[0].minutes : 60;

  let index = slots.findIndex(
    (slot, position) =>
      start >= slot.minutes && (position === slots.length - 1 || start < slots[position + 1].minutes),
  );
  if (index < 0) index = start < slots[0].minutes ? 0 : slots.length - 1;

  const first = slots[index].minutes;
  const span = Math.max(1, Math.ceil((end - first) / size));
  return { index, span: Math.min(span, slots.length - index) };
}

/** The slot an entry starts in, used to describe the grid position. */
export function slotLabel(slots: GridSlot[], index: number) {
  return slots[index]?.start ?? "";
}
