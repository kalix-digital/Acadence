/**
 * Phase 1 shell data.
 *
 * These figures exist only to validate the dashboard layout and chart
 * rendering. Every value is replaced by a Supabase-backed query in Phase 2;
 * nothing here should be treated as institutional data.
 */
export const overviewStats = [
  {
    id: "students",
    label: "Students enrolled",
    value: "12,480",
    change: "+4.2%",
    note: "vs. last session",
    trend: "up" as const,
    tone: "primary" as const,
  },
  {
    id: "lecturers",
    label: "Lecturers",
    value: "684",
    change: "+1.8%",
    note: "across 9 faculties",
    trend: "up" as const,
    tone: "violet" as const,
  },
  {
    id: "courses",
    label: "Active courses",
    value: "1,236",
    change: "68%",
    note: "scheduled this semester",
    trend: "up" as const,
    tone: "green" as const,
  },
];

export const bannerStats = [
  { label: "Published timetables", value: "42" },
  { label: "Unresolved conflicts", value: "7" },
  { label: "Room utilisation", value: "81%" },
];

export const timetableActivity = [
  { month: "Aug", published: 24, drafts: 12 },
  { month: "Sep", published: 38, drafts: 18 },
  { month: "Oct", published: 31, drafts: 22 },
  { month: "Nov", published: 46, drafts: 14 },
  { month: "Dec", published: 58, drafts: 26 },
  { month: "Jan", published: 44, drafts: 19 },
  { month: "Feb", published: 52, drafts: 16 },
  { month: "Mar", published: 61, drafts: 21 },
  { month: "Apr", published: 42, drafts: 9 },
];

export const roomUtilisation = [
  { name: "Lecture halls", value: 46, fill: "var(--chart-1)" },
  { name: "Laboratories", value: 27, fill: "var(--chart-3)" },
  { name: "Seminar rooms", value: 17, fill: "var(--chart-2)" },
  { name: "Computer labs", value: 10, fill: "var(--chart-5)" },
];

export const conflicts = [
  {
    id: "CF-1042",
    title: "Dr. Okafor double-booked",
    detail: "CSC 401 · Mon 10:00 — overlaps CSC 305",
    severity: "critical" as const,
  },
  {
    id: "CF-1038",
    title: "Hall capacity exceeded",
    detail: "MTH 101 · 420 students in 300-seat hall",
    severity: "high" as const,
  },
  {
    id: "CF-1027",
    title: "Lab suitability mismatch",
    detail: "CHM 210 · requires a wet laboratory",
    severity: "medium" as const,
  },
  {
    id: "CF-1019",
    title: "Workload limit reached",
    detail: "Prof. Balogun · 21 of 20 contact hours",
    severity: "low" as const,
  },
];

export const upcomingEvents = [
  { day: "24", month: "Nov", title: "First semester examinations begin", tag: "Examinations" },
  { day: "28", month: "Nov", title: "Faculty board — timetable review", tag: "Governance" },
  { day: "02", month: "Dec", title: "Course registration closes", tag: "Deadline" },
  { day: "09", month: "Dec", title: "Departmental workload approvals due", tag: "Workload" },
];

export const lecturerWorkload = [
  { name: "Prof. A. Balogun", department: "Computer Science", hours: 21, limit: 20 },
  { name: "Dr. N. Okafor", department: "Mathematics", hours: 17, limit: 20 },
  { name: "Dr. F. Adeyemi", department: "Physics", hours: 14, limit: 20 },
  { name: "Mrs. C. Eze", department: "Chemistry", hours: 11, limit: 20 },
];

export const recentActivity = [
  {
    id: "ACT-2041",
    actor: "Dr. N. Okafor",
    action: "Published timetable v3",
    scope: "Computer Science · 400 level",
    time: "12 min ago",
    status: "published" as const,
  },
  {
    id: "ACT-2040",
    actor: "Faculty office",
    action: "Approved change request",
    scope: "MTH 201 · Tuesday 08:00",
    time: "48 min ago",
    status: "approved" as const,
  },
  {
    id: "ACT-2039",
    actor: "Registry",
    action: "Opened first semester exams",
    scope: "Institution-wide calendar",
    time: "2 hrs ago",
    status: "scheduled" as const,
  },
  {
    id: "ACT-2038",
    actor: "Dr. F. Adeyemi",
    action: "Submitted draft timetable",
    scope: "Physics · 200 level",
    time: "3 hrs ago",
    status: "draft" as const,
  },
  {
    id: "ACT-2037",
    actor: "Prof. A. Balogun",
    action: "Flagged room suitability",
    scope: "CHM 210 · Laboratory 4",
    time: "Yesterday",
    status: "flagged" as const,
  },
];
