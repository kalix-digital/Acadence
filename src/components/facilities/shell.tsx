import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  { href: "/institution/facilities", label: "Overview", key: "overview" },
  { href: "/institution/facilities/buildings", label: "Buildings", key: "building" },
  { href: "/institution/facilities/rooms", label: "Rooms & equipment", key: "room" },
  { href: "/institution/facilities/features", label: "Features", key: "feature" },
  { href: "/institution/facilities/availability", label: "Availability", key: "availability" },
  { href: "/institution/facilities/bookings", label: "Bookings", key: "booking" },
  { href: "/institution/facilities/utilisation", label: "Utilisation", key: "utilisation" },
];

export function FacilitiesBackLink() {
  return (
    <Link
      href="/institution/facilities"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" /> Classrooms & facilities
    </Link>
  );
}

export function FacilitiesNav({ current }: { current: string }) {
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
