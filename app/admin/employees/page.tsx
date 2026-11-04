import Link from "next/link";
import { ArrowUpRight, UserCog } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
import { EmptyState } from "@/components/empty-state";
import { EmployeeStatusActions } from "@/components/admin/employee-status-actions";
import { requireAdmin } from "@/lib/auth";
import { listEmployeesWithCounts } from "@/lib/admin";
import { formatDateTime } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import type { User } from "@/db/schema";

export const dynamic = "force-dynamic";

function statusVariant(status: User["status"]) {
  if (status === "active") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "destructive" as const;
}

export default async function AdminEmployeesPage() {
  await requireAdmin();
  const settingsRow = await getSettings();
  const employees = await listEmployeesWithCounts();
  const pending = employees.filter(
    (employee) => employee.status === "pending",
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description="Approve new accounts, deactivate access, and open any employee workspace."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Team members
          </p>
          <p className="mt-1 text-2xl font-bold">{employees.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending approval
          </p>
          <p className="mt-1 text-2xl font-bold">{pending}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active
          </p>
          <p className="mt-1 text-2xl font-bold">
            {employees.filter((employee) => employee.status === "active").length}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {employees.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={UserCog}
              title="No accounts yet"
              description="Employees appear here after their first sign-up."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <p className="font-semibold">
                      {employee.fullName || employee.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {employee.email}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {employee.role}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(employee.status)}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {employee.leadCount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(employee.lastSeenAt, settingsRow.timezone)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/employees/${employee.id}`}>
                          Open
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <EmployeeStatusActions
                        userId={employee.id}
                        status={employee.status}
                        role={employee.role}
                        name={employee.fullName || employee.email}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
