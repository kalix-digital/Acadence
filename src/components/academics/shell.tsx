import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ACADEMIC_ENTITIES, type AcademicEntity } from "@/lib/academics/constants";

const SECTIONS: { entity: AcademicEntity; label: string }[] = [
  { entity: "campus", label: "Campuses" },
  { entity: "faculty", label: "Faculties" },
  { entity: "department", label: "Departments" },
  { entity: "session", label: "Sessions & semesters" },
  { entity: "programme", label: "Programmes" },
  { entity: "course", label: "Courses & curriculum" },
  { entity: "student", label: "Students" },
  { entity: "lecturer", label: "Lecturers" },
  { entity: "group", label: "Groups" },
  { entity: "offering", label: "Offerings" },
  { entity: "calendarEvent", label: "Calendar" },
];

export function AcademicsBackLink() {
  return (
    <Link
      href="/institution/academics"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" /> Academic administration
    </Link>
  );
}

export function AcademicsNav({ current }: { current: AcademicEntity }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {SECTIONS.map((section) => {
        const active = section.entity === current;
        return (
          <Link
            key={section.entity}
            href={ACADEMIC_ENTITIES[section.entity].path}
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
