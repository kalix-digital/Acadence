"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { roomUtilisation } from "@/data/dashboard";

export function RoomUtilisation() {
  return (
    <Card className="ring-border/70">
      <CardHeader>
        <CardTitle>Room utilisation</CardTitle>
        <CardDescription>Share of scheduled teaching hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-[176px] w-full max-w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={roomUtilisation}
                dataKey="value"
                nameKey="name"
                innerRadius="66%"
                outerRadius="94%"
                paddingAngle={3}
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {roomUtilisation.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value) => [`${Number(value)}%`, "Share"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-semibold tracking-tight">81%</p>
              <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                Average
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-4 space-y-2.5">
          {roomUtilisation.map((room) => (
            <li key={room.name} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: room.fill }}
              />
              <span className="text-muted-foreground">{room.name}</span>
              <span className="ml-auto font-medium">{room.value}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
