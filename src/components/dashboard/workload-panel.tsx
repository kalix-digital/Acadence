import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { lecturerWorkload } from "@/data/dashboard";
import { cn } from "@/lib/utils";

export function WorkloadPanel() {
  return (
    <Card className="ring-border/70">
      <CardHeader>
        <CardTitle>Lecturer workload</CardTitle>
        <CardDescription>Weekly contact hours against approved limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lecturerWorkload.map((lecturer) => {
          const ratio = Math.round((lecturer.hours / lecturer.limit) * 100);
          const overloaded = lecturer.hours > lecturer.limit;

          return (
            <div key={lecturer.name} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{lecturer.name}</span>
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    overloaded ? "font-medium text-destructive" : "text-muted-foreground",
                  )}
                >
                  {lecturer.hours}/{lecturer.limit}h
                </span>
              </div>
              <Progress
                value={Math.min(ratio, 100)}
                className={cn("h-1.5", overloaded && "[&>div]:bg-destructive")}
              />
              <p className="text-[0.7rem] text-muted-foreground">{lecturer.department}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
