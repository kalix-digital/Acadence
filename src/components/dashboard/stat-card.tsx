import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneStyles = {
  primary: "bg-primary/12 text-primary ring-primary/25",
  violet: "bg-chart-3/12 text-chart-3 ring-chart-3/25",
  green: "bg-chart-4/12 text-chart-4 ring-chart-4/25",
  amber: "bg-chart-5/12 text-chart-5 ring-chart-5/25",
} as const;

export function StatCard({
  label,
  value,
  change,
  note,
  trend,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  note: string;
  trend: "up" | "down";
  tone: keyof typeof toneStyles;
  icon: LucideIcon;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="h-full justify-between ring-border/70">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl ring-1",
              toneStyles[tone],
            )}
          >
            <Icon className="size-5" />
          </span>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 flex items-center gap-1 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                trend === "up"
                  ? "bg-chart-4/12 text-chart-4"
                  : "bg-destructive/12 text-destructive",
              )}
            >
              <TrendIcon className="size-3" />
              {change}
            </span>
            <span className="text-muted-foreground">{note}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
