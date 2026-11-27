import type { Metadata } from "next";
import Link from "next/link";
import { FacilitiesNav } from "@/components/facilities/shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireFacilitiesAccess } from "@/lib/facilities/access";
import { facilitiesSummary } from "@/lib/facilities/data";

export const metadata: Metadata = { title: "Classrooms & facilities" };

const SECTIONS = [
  {
    href: "/institution/facilities/buildings",
    title: "Buildings",
    description: "Buildings on each campus, with their code and address.",
  },
  {
    href: "/institution/facilities/rooms",
    title: "Rooms & equipment",
    description: "Classrooms, lecture halls, laboratories and studios, their seats and equipment.",
  },
  {
    href: "/institution/facilities/features",
    title: "Feature catalogue",
    description: "The features and equipment this institution records against rooms.",
  },
  {
    href: "/institution/facilities/availability",
    title: "Availability",
    description: "Weekly opening windows per room, per semester. A room cannot be booked outside them.",
  },
  {
    href: "/institution/facilities/bookings",
    title: "Bookings",
    description: "Ad-hoc room bookings. Two confirmed bookings can never overlap in one room.",
  },
  {
    href: "/institution/facilities/utilisation",
    title: "Utilisation",
    description: "Booked hours over available hours per room, for one semester.",
  },
];

export default async function FacilitiesOverviewPage() {
  const context = await requireFacilitiesAccess();
  const institutionId = context.membership.institutionId;

  if (!institutionId) {
    return <p className="text-sm text-muted-foreground">No active institution is selected.</p>;
  }

  const summary = await facilitiesSummary(institutionId);

  const stats = [
    { label: "Buildings", value: summary.buildings },
    { label: "Rooms", value: summary.rooms },
    { label: "Seats", value: summary.seats },
    { label: "Features", value: summary.features },
    { label: "Upcoming bookings", value: summary.upcomingBookings },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Classrooms & facilities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every room belongs to a building on a campus, and every booking is checked
          against the room&apos;s capacity, its availability window and the bookings
          already in place.
        </p>
      </div>

      <FacilitiesNav current="overview" />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.href}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={section.href} className="hover:text-primary">
                  {section.title}
                </Link>
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How conflicts are prevented</CardTitle>
          <CardDescription>
            The database, not the screen, is the source of truth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            A confirmed booking occupies a half-open time range. A database exclusion
            constraint rejects any second confirmed booking that overlaps it, including
            when two people book at the same moment.
          </p>
          <p>
            Capacity, the semester window and the room&apos;s availability are checked by
            a trigger before the row is written, so a booking that breaks them is
            refused with the reason rather than silently saved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
