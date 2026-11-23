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

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
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
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Analytics", href: "#", icon: BarChart3, phase: 15 },
      { label: "Reports", href: "#", icon: ClipboardList, phase: 15 },
    ],
  },
  {
    id: "academic",
    label: "Academic",
    items: [
      { label: "Academic Administration", href: "#", icon: Library, phase: 4 },
      { label: "Timetable Management", href: "#", icon: CalendarRange, phase: 6 },
      { label: "Scheduling Engine", href: "#", icon: Sparkles, phase: 8 },
      { label: "Classrooms & Facilities", href: "#", icon: Building2, phase: 5 },
      { label: "Academic Calendar", href: "#", icon: CalendarDays, phase: 10 },
      { label: "Attendance", href: "#", icon: BookOpenCheck, phase: 12 },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { label: "Students", href: "#", icon: GraduationCap, phase: 4 },
      { label: "Lecturers", href: "#", icon: Users, phase: 9 },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [{ label: "Institution Settings", href: "#", icon: Settings, phase: 3 }],
  },
];

export const iconRailItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Academic administration", icon: Library, href: "#" },
  { label: "Timetables", icon: CalendarRange, href: "#" },
  { label: "Facilities", icon: Building2, href: "#" },
  { label: "Analytics", icon: BarChart3, href: "#" },
  { label: "Settings", icon: Settings, href: "#" },
];
