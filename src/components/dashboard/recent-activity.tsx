import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { recentActivity } from "@/data/dashboard";

const statusStyles = {
  published: "border-chart-4/30 bg-chart-4/12 text-chart-4",
  approved: "border-primary/30 bg-primary/12 text-primary",
  scheduled: "border-chart-3/30 bg-chart-3/12 text-chart-3",
  draft: "border-border bg-muted/60 text-muted-foreground",
  flagged: "border-chart-5/30 bg-chart-5/12 text-chart-5",
} as const;

export function RecentActivity() {
  return (
    <Card className="ring-border/70">
      <CardHeader>
        <CardTitle>Recent institutional activity</CardTitle>
        <CardDescription>
          Timetable and calendar events recorded across your institution
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="hidden md:table-cell">Scope</TableHead>
              <TableHead className="hidden sm:table-cell">When</TableHead>
              <TableHead className="pr-4 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActivity.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-4 font-medium">{row.actor}</TableCell>
                <TableCell className="text-muted-foreground">{row.action}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {row.scope}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                  {row.time}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Badge
                    variant="outline"
                    className={`capitalize ${statusStyles[row.status]}`}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
