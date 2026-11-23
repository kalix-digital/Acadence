import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { conflicts } from "@/data/dashboard";
import { cn } from "@/lib/utils";

const severityStyles = {
  critical: "border-destructive/30 bg-destructive/12 text-destructive",
  high: "border-chart-5/30 bg-chart-5/12 text-chart-5",
  medium: "border-chart-3/30 bg-chart-3/12 text-chart-3",
  low: "border-border bg-muted/60 text-muted-foreground",
} as const;

export function ConflictPanel() {
  return (
    <Card id="conflicts" className="ring-border/70">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Scheduling conflicts</CardTitle>
          <CardDescription>Hard constraint violations block publication</CardDescription>
        </div>
        <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive">
          <AlertTriangle className="size-3" /> 7 open
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {conflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
          >
            <span className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
              {conflict.id}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{conflict.title}</p>
              <p className="truncate text-xs text-muted-foreground">{conflict.detail}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md border px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide",
                severityStyles[conflict.severity],
              )}
            >
              {conflict.severity}
            </span>
          </div>
        ))}
      </CardContent>
      <div className="px-4 pb-4">
        <Link
          href="#"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Conflict engine arrives in Phase 7 <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
