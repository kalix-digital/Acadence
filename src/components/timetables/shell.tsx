import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  { href: "/institution/timetables", label: "Drafts", key: "overview" },
  { href: "/institution/timetables/views", label: "Timetable views", key: "views" },
  { href: "/institution/timetables/versions", label: "Version history", key: "versions" },
  { href: "/institution/timetables/requests", label: "Change requests", key: "requests" },
];

export function TimetablesBackLink() {
  return (
    <Link
      href="/institution/timetables"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" /> Timetable management
    </Link>
  );
}

export function TimetablesNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {SECTIONS.map((section) => {
        const active = section.key === current;
        return (
          <Link
            key={section.key}
            href={section.href}
            className={
              active
                ? "rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                : "rounded-lg border border-border/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            }
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

const UPDATED_MESSAGES: Record<string, string> = {
  created: "Draft created. Add entries, then publish when the grid is ready.",
  saved: "Changes saved.",
  removed: "Entry removed from the draft.",
  archived: "Archived. It is kept for history and can be restored.",
  restored: "Restored.",
  requested: "Change request submitted. An administrator will review it.",
  approved: "Change approved and published as a new version.",
  rejected: "Change request rejected. The timetable is unchanged.",
};

export function TimetableFlash({
  updated,
  error,
  extra,
}: {
  updated?: string;
  error?: string;
  extra?: string;
}) {
  if (updated && UPDATED_MESSAGES[updated]) {
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
      >
        {UPDATED_MESSAGES[updated]}
        {extra ? ` ${extra}` : ""}
      </p>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="whitespace-pre-line rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
      >
        {error}
      </p>
    );
  }

  return null;
}
