import Link from "next/link";
import { Archive, ArchiveRestore, Pencil, Search } from "lucide-react";
import { archiveAcademicRecordAction } from "@/app/institution/academics/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACADEMIC_ENTITIES, type AcademicEntity } from "@/lib/academics/constants";

const UPDATED_MESSAGES: Record<string, string> = {
  created: "Record created.",
  saved: "Changes saved.",
  archived: "Record archived. It is kept for history and can be restored.",
  restored: "Record restored.",
};

export function AcademicFlash({
  updated,
  error,
}: {
  updated?: string;
  error?: string;
}) {
  if (updated && UPDATED_MESSAGES[updated]) {
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
      >
        {UPDATED_MESSAGES[updated]}
      </p>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
      >
        {error}
      </p>
    );
  }

  return null;
}

export function AcademicToolbar({
  entity,
  q,
  archived,
  total,
}: {
  entity: AcademicEntity;
  q?: string;
  archived: boolean;
  total: number;
}) {
  const basePath = ACADEMIC_ENTITIES[entity].path;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-border/70 p-0.5">
        <Link
          href={basePath}
          className={
            archived
              ? "rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              : "rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          }
        >
          Active
        </Link>
        <Link
          href={`${basePath}?archived=1`}
          className={
            archived
              ? "rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              : "rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          }
        >
          Archived
        </Link>
      </div>

      <form action={basePath} className="flex items-center gap-2">
        {archived && <input type="hidden" name="archived" value="1" />}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or code"
            className="h-8 w-56 rounded-lg border border-input bg-transparent pl-8 pr-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" className="h-8 rounded-lg">
          Search
        </Button>
        <span className="text-xs text-muted-foreground">
          {total} record{total === 1 ? "" : "s"}
        </span>
      </form>
    </div>
  );
}

export type AcademicTableRow = {
  id: string;
  archived: boolean;
  cells: React.ReactNode[];
};

export function AcademicTable({
  entity,
  columns,
  rows,
  editParam = "edit",
}: {
  entity: AcademicEntity;
  columns: string[];
  rows: AcademicTableRow[];
  /** Query parameter the edit link uses, so secondary lists do not edit the primary record. */
  editParam?: string;
}) {
  const basePath = ACADEMIC_ENTITIES[entity].path;

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
              <div className="flex items-center justify-end gap-1">
                {row.archived && (
                  <Badge variant="secondary" className="mr-1 text-[0.6rem]">
                    Archived
                  </Badge>
                )}
                <Button asChild size="xs" variant="ghost">
                  <Link href={`${basePath}?${editParam}=${row.id}`}>
                    <Pencil /> Edit
                  </Link>
                </Button>
                <form action={archiveAcademicRecordAction}>
                  <input type="hidden" name="entity" value={entity} />
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="archived" value={row.archived ? "0" : "1"} />
                  <SubmitButton
                    size="xs"
                    variant="outline"
                    pendingLabel={row.archived ? "Restoring…" : "Archiving…"}
                  >
                    {row.archived ? <ArchiveRestore /> : <Archive />}
                    {row.archived ? "Restore" : "Archive"}
                  </SubmitButton>
                </form>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AcademicPagination({
  basePath,
  page,
  pageCount,
  q,
  archived,
  pageParam = "page",
  extraParams,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  q?: string;
  archived: boolean;
  /** Query parameter this list pages on, so secondary lists do not move the main table. */
  pageParam?: string;
  /** Other list state to carry across a page change. */
  extraParams?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (archived) params.set("archived", "1");
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set(pageParam, String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg">
            <Link href={href(page - 1)}>Previous</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled>
            Previous
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild size="sm" variant="outline" className="h-8 rounded-lg">
            <Link href={href(page + 1)}>Next</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-8 rounded-lg" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
