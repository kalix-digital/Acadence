import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TimetableStatusBadge({ status }: { status: string }) {
  const variant =
    status === "published"
      ? "default"
      : status === "superseded"
        ? "secondary"
        : status === "archived"
          ? "outline"
          : "secondary";

  return (
    <Badge variant={variant} className="text-[0.6rem] capitalize">
      {status}
    </Badge>
  );
}

export type TimetableTableRow = {
  id: string;
  cells: React.ReactNode[];
  actions?: React.ReactNode;
};

export function TimetableTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: TimetableTableRow[];
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {empty ?? "Nothing recorded yet."}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            {row.cells.map((cell, index) => (
              <TableCell key={index} className="align-top text-sm">
                {cell}
              </TableCell>
            ))}
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">{row.actions}</div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
