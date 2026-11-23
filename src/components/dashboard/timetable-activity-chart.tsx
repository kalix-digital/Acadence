"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { timetableActivity } from "@/data/dashboard";

export function TimetableActivityChart() {
  return (
    <Card id="timetable-activity" className="ring-border/70">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Timetable activity</CardTitle>
          <CardDescription>Published versus draft versions per month</CardDescription>
        </div>
        <span className="rounded-lg border border-border/70 bg-muted/40 px-2 py-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
          2026/2027
        </span>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timetableActivity} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="publishedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="draftFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 6" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              <Area
                type="monotone"
                dataKey="published"
                name="Published"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#publishedFill)"
              />
              <Area
                type="monotone"
                dataKey="drafts"
                name="Drafts"
                stroke="var(--chart-3)"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="url(#draftFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
