"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/date";
import type { EmployeePerformanceRow } from "@/lib/admin";

type SortKey =
  | "fullName"
  | "messages"
  | "newLeads"
  | "replies"
  | "replyRate"
  | "calls"
  | "won"
  | "noReply"
  | "overdue"
  | "lastActive";

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "fullName", label: "Employee" },
  { key: "messages", label: "Messages", numeric: true },
  { key: "newLeads", label: "New leads", numeric: true },
  { key: "replies", label: "Replies", numeric: true },
  { key: "replyRate", label: "Reply rate", numeric: true },
  { key: "calls", label: "Calls", numeric: true },
  { key: "won", label: "Won", numeric: true },
  { key: "noReply", label: "No reply", numeric: true },
  { key: "overdue", label: "Overdue", numeric: true },
  { key: "lastActive", label: "Last active" },
];

function sortValue(row: EmployeePerformanceRow, key: SortKey) {
  if (key === "lastActive") return row.lastActive?.getTime() ?? 0;
  if (key === "fullName") return row.fullName || row.email;
  return row[key];
}

export function PerformanceTable({
  rows,
  target,
  timeZone,
}: {
  rows: EmployeePerformanceRow[];
  target: number;
  timeZone: string;
}) {
  const [sortKey, setSortKey] = React.useState<SortKey>("messages");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const sorted = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (typeof left === "string" || typeof right === "string") {
        return String(left).localeCompare(String(right));
      }
      return (left as number) - (right as number);
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "fullName" ? "asc" : "desc");
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No team members yet"
        description="Approved employees will appear here with their performance."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => {
            const active = sortKey === column.key;
            return (
              <TableHead
                key={column.key}
                className={column.numeric ? "text-right" : undefined}
                aria-sort={
                  active
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="inline-flex items-center gap-1 rounded-sm uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {column.label}
                  {active ? (
                    sortDir === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )
                  ) : (
                    <ChevronsUpDown className="h-3 w-3 opacity-50" />
                  )}
                </button>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => {
          const noActivity = !row.activeToday;
          const belowTarget = row.messagesToday < target;
          return (
            <TableRow
              key={row.id}
              className={
                noActivity
                  ? "bg-rose-50/60 dark:bg-rose-950/20"
                  : undefined
              }
            >
              <TableCell>
                <Link
                  href={`/admin/employees/${row.id}`}
                  className="font-semibold text-foreground"
                >
                  {row.fullName || row.email}
                </Link>
                <p className="text-xs text-muted-foreground">{row.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {row.status !== "active" ? (
                    <Badge variant="outline">{row.status}</Badge>
                  ) : null}
                  {noActivity ? (
                    <Badge variant="destructive">No activity today</Badge>
                  ) : null}
                  {belowTarget ? (
                    <Badge variant="warning">Below target</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.messages}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.newLeads}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.replies}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.replyRate}%
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.calls}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.won}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.noReply}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.overdue}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTime(row.lastActive, timeZone)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
