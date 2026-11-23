import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { upcomingEvents } from "@/data/dashboard";

export function UpcomingEvents() {
  return (
    <Card className="ring-border/70">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Upcoming academic events</CardTitle>
          <CardDescription>Institution calendar · November–December</CardDescription>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
          <CalendarDays className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-3.5 border-l border-border/70 pl-5">
          {upcomingEvents.map((event) => (
            <li key={event.title} className="relative">
              <span className="absolute -left-[26px] top-1.5 size-2 rounded-full bg-primary ring-4 ring-background" />
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{event.title}</p>
                <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                  {event.day} {event.month}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{event.tag}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
