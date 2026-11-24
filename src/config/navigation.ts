import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "@/lib/auth/capabilities";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Capability required to see the entry; omitted means everyone. */
  capability?: Capability;
  /** Modules scheduled for a later implementation phase. */
  phase?: number;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const navigation: NavSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/institution",
        icon: LayoutDashboard,
        capability: "view_institution_dashboard",
      },
      {
        label: "Analytics",
        href: "#",
        icon: BarChart3,
        capability: "view_analytics",
        phase: 15,
      },
      {
        label: "Reports",
        href: "#",
        icon: ClipboardList,
        capability: "view_analytics",
        phase: 15,
      },
    ],
  },
  {
    id: "academic",
    label: "Academic",
    items: [
      {
        label: "Academic Administration",
        href: "#",
        icon: Library,
        capability: "manage_academics",
        phase: 4,
      },
      {
        label: "Timetable Management",
        href: "#",
        icon: CalendarRange,
        capability: "manage_timetables",
        phase: 6,
      },
      {
        label: "Scheduling Engine",
        href: "#",
        icon: Sparkles,
        capability: "manage_timetables",
        phase: 8,
      },
      {
        label: "Classrooms & Facilities",
        href: "#",
        icon: Building2,
        capability: "manage_facilities",
        phase: 5,
      },
      {
        label: "Academic Calendar",
        href: "#",
        icon: CalendarDays,
        capability: "view_institution_dashboard",
        phase: 10,
      },
      {
        label: "Attendance",
        href: "#",
        icon: BookOpenCheck,
        capability: "manage_academics",
        phase: 12,
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        label: "Students",
        href: "#",
        icon: GraduationCap,
        capability: "manage_academics",
        phase: 4,
      },
      {
        label: "Lecturers",
        href: "#",
        icon: Users,
        capability: "manage_workload",
        phase: 9,
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      {
        label: "Institution Settings",
        href: "#",
        icon: Settings,
        capability: "manage_institution",
        phase: 3,
      },
      {
        label: "Members & Roles",
        href: "#",
        icon: Users,
        capability: "manage_members",
        phase: 3,
      },
    ],
  },
];

export const iconRailItems: (NavItem & { capability?: Capability })[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/institution",
    capability: "view_institution_dashboard",
  },
  {
    label: "Academic administration",
    icon: Library,
    href: "#",
    capability: "manage_academics",
  },
  {
    label: "Timetables",
    icon: CalendarRange,
    href: "#",
    capability: "manage_timetables",
  },
  {
    label: "Facilities",
    icon: Building2,
    href: "#",
    capability: "manage_facilities",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "#",
    capability: "view_analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "#",
    capability: "manage_institution",
  },
];
