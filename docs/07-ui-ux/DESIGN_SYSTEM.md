# Acadence — Design System

> **Document ID:** UX-DS-001 · **Version:** 1.0 · **Status:** Implemented (Phase 1) and binding on all later phases · **Date:** 2026-11-23 · **Owner:** Design
> **Reference:** [`reference-dashboard.png`](reference-dashboard.png) · **Related:** [PRD](../03-requirements/PRD.md) · [Screen Inventory](SCREEN_INVENTORY.md) · [Architecture](../04-architecture/SYSTEM_ARCHITECTURE.md)

## 1. Direction

Acadence is a **premium enterprise academic operations platform**. The reference dashboard supplies the visual language — deep navy surfaces, a fixed icon rail plus grouped sidebar, a minimal top bar, rounded cards, blue accents and modern charts — while all content and terminology is academic, never e-commerce.

Rules that never change:

1. Dark navy is the default theme; light mode is fully supported.
2. Every screen uses the shared shell and tokens. No module invents its own colours, radii or spacing.
3. Charts, tables and cards are shared components, not one-off implementations.
4. Numbers are real or explicitly labelled as sample; no fabricated institutional figures.
5. Interfaces are keyboard operable and readable at 4.5:1 contrast.

## 2. Colour tokens

Tokens live in `src/app/globals.css` as CSS variables consumed by Tailwind (`bg-card`, `text-muted-foreground`, `border-border`, …). Values below are the implemented dark theme with the light theme in brackets.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--background` | `#060c19` | `#f3f6fc` | App canvas |
| `--card` | `#0d1729` | `#ffffff` | Cards, panels, tables |
| `--popover` | `#0f1b30` | `#ffffff` | Menus, tooltips, chart tooltips |
| `--foreground` | `#e8eefc` | `#0b1220` | Primary text |
| `--muted-foreground` | `#8ba0c0` | `#5a6b86` | Secondary text, axis labels |
| `--primary` | `#3b82f6` | `#2563eb` | Primary action, active nav, focus ring |
| `--secondary` / `--accent` | `#152239` / `#17263f` | `#e7eefb` / `#e6effe` | Hover surfaces, chips |
| `--border` | `#1a2740` | `#dbe4f3` | Dividers, card rings |
| `--destructive` | `#ef4444` | `#dc2626` | Errors, critical conflicts |
| `--chart-1…5` | `#3b82f6`, `#22d3ee`, `#a78bfa`, `#34d399`, `#fbbf24` | same hues, darker | Series, status, categories |
| `--sidebar` | `#091323` | `#ffffff` | Navigation surfaces |

Semantic status mapping: success `chart-4`, warning `chart-5`, info `chart-1`, danger `destructive`, neutral `muted`.

Two decorative treatments are part of the identity: `dashboard-surface` (soft blue radial wash behind content) and `glass-panel` (translucent blurred top bar).

## 3. Typography

- Family: **Geist** (`--font-geist-sans`), mono **Geist Mono** for IDs, codes and table numerics.
- Scale: page title 24/32 semibold · section title 16/22 medium · body 14/20 · table 14 · caption 12 · micro-label 10–11 uppercase with 0.14em tracking.
- Numerals in metrics use tabular spacing; figures are semibold, labels regular and muted.
- No text below 12 px in content areas; 10–11 px is reserved for tracked labels and badges.

## 4. Spacing, radius, elevation

| Property | Value |
| --- | --- |
| Spacing scale | 4 px base (Tailwind); card padding 16–24 px; section gaps 16–20 px |
| Radius | `--radius: 0.85rem`; cards and panels 14–16 px, controls 10–12 px, pills full |
| Elevation | Cards: 1 px ring (`ring-border/70`) and no heavy shadow; primary surfaces shadow only where emphasis is required (banner) |
| Density | Comfortable: 40 px row height tables, 36–40 px inputs and buttons |

## 5. Layout shell (implemented)

```
┌────┬──────────────┬───────────────────────────────────────────────┐
│icon│  sidebar     │  top bar: breadcrumbs · search · theme · bell │
│rail│  256 px      │           notifications · profile             │
│64px│              ├───────────────────────────────────────────────┤
│    │              │  content: max 1500 px, 16–24 px gutter,       │
│    │              │  dashboard-surface wash                       │
└────┴──────────────┴───────────────────────────────────────────────┘
```

- **Icon rail** — hidden below `lg`; logo tile, six destination icons with tooltips, avatar at the bottom.
- **Sidebar** — hidden below `lg` (available via the mobile sheet); collapsible groups (Workspace, Academic, People, Administration), active item marked with a blue inset bar; planned modules show a `P#` phase chip and are non-committal links.
- **Top bar** — sticky, 64 px, translucent; mobile menu trigger, breadcrumbs, search with ⌘K hint, theme selector, notifications dropdown with unread dot, account menu with institution switching.
- **Content** — page header (micro-label context line + title + status badge), then card sections.

## 6. Component inventory

All primitives are shadcn/ui (Radix) in `src/components/ui/`. Composite components are shared and reused; a module must not fork them.

| Layer | Components | Location |
| --- | --- | --- |
| Primitives | Button, Card, Badge, Input, Avatar, Separator, DropdownMenu, Progress, Tooltip, Sheet, Skeleton, ScrollArea, Table | `src/components/ui/` |
| Layout | IconRail, SidebarNav, Topbar, DashboardShell, ThemeToggle, ThemeProvider | `src/components/layout/`, `src/components/` |
| Dashboard | WelcomeBanner, StatCard, TimetableActivityChart, RoomUtilisation, ConflictPanel, UpcomingEvents, WorkloadPanel, RecentActivity | `src/components/dashboard/` |
| Shared (planned) | PageHeader, DataTable, FilterBar, EmptyState, ErrorState, ConfirmDialog, StatusBadge, FormField, ImportWizard, Pagination | `src/components/shared/` |

Component rules:

- Every data surface implements **loading** (Skeleton), **empty** (EmptyState with next action), **error** (ErrorState with retry) and **success** (toast or inline confirmation) states.
- Destructive actions require a confirmation dialog naming the entity.
- Status is always conveyed by text as well as colour.
- Charts use chart tokens only; the tooltip uses `--popover`.

## 7. Dashboard specification

Institution dashboard (implemented, Phase 1):

1. Header: institution · role context, title, "sample data" badge while unseeded.
2. Banner: semester, greeting, scheduling progress, three inline figures, primary and secondary action.
3. Stat cards: students, lecturers, active courses — value, delta, context.
4. Timetable activity area chart: published vs draft per month.
5. Room utilisation donut: share of scheduled hours with centre average.
6. Scheduling conflicts: severity-coded list with IDs and detail.
7. Upcoming academic events: calendar timeline.
8. Lecturer workload: contact hours vs limit with overload highlighting.
9. Recent institutional activity table: actor, action, scope, time, status.

Role-specific dashboards (Phases 2 and 15) reuse the same components with role-appropriate content:

| Role | Emphasis |
| --- | --- |
| Platform Super Admin | Institutions, active subscriptions, platform usage, support queue |
| Institution Admin | Institution metrics, conflicts, utilisation, workload, activity |
| Faculty Admin | Faculty timetable status, department conflicts, approvals |
| Department Admin | Draft progress, clashes, room capacity, lecturer assignments |
| Lecturer | Today's classes, personal timetable, workload, change requests |
| Student | Today's classes, personal timetable, exam dates, notifications |

## 8. Interaction and feedback

- Focus rings use `--ring` with 2 px offset; all controls reachable by Tab.
- Buttons show pending state and disable during submission; no double submission.
- Optimistic updates are not used for timetable publishing, approvals or payments — those wait for the server.
- Toasts confirm success; form errors appear inline at the field and in a summary alert.
- Motion is subtle (120–200 ms); `prefers-reduced-motion` disables non-essential animation.
- Long operations show progress (generation runs, imports) and remain cancellable where the domain allows.

## 9. Responsiveness

| Breakpoint | Layout |
| --- | --- |
| < 640 px | Single column; rail hidden; sidebar via sheet; charts full width with 220 px min height |
| 640–1023 px | Two-column card grid; top bar condensed; tables drop low-priority columns |
| 1024–1439 px | Rail + sidebar + content; dashboard 2-column charts |
| ≥ 1440 px | Full 3-column dashboard rows, content capped at 1500 px |

Tables use horizontal scroll rather than truncating critical data below `md`.

## 10. Accessibility (WCAG 2.2 AA)

- Text contrast ≥ 4.5:1 (muted text ≥ 4.5:1 on card surfaces), non-text ≥ 3:1.
- Every icon-only control has an accessible name; charts have a text summary or data table alternative.
- Form fields use labels, `aria-describedby` for errors, and never rely on placeholder text alone.
- Keyboard: no traps; menus and dialogs restore focus; skip link to main content.
- Colour is never the sole indicator of severity or status.
- 200% zoom and 320 px reflow remain usable.

## 11. Do / don't

| Do | Don't |
| --- | --- |
| Use academic language (courses, offerings, groups, rooms, semesters) | Reuse commerce terms (orders, products, revenue) |
| Compose screens from shared cards and tables | Build a bespoke layout per module |
| Show real numbers with an "as of" timestamp | Fabricate institutional data or hide sample data |
| Keep one primary action per view | Stack competing primary buttons |
| Label planned features plainly | Ship dead buttons that pretend to work |

## 12. Revision history

| Version | Date | Author | Change |
| --- | --- | --- | --- |
| 1.0 | 2026-11-23 | Design | Tokens and components documented as implemented in Phase 1 |
