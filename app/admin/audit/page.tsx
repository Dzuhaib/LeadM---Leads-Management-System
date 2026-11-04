import Link from "next/link";
import { ArrowLeft, ArrowRight, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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
import { requireAdmin } from "@/lib/auth";
import { listAuditEntries } from "@/lib/audit";
import { formatDateTime } from "@/lib/date";
import { getSettings } from "@/lib/settings";
import { auditLogParamsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function actionLabel(action: string) {
  const text = action.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settingsRow = await getSettings();

  const parsed = auditLogParamsSchema.safeParse({
    page: single(params.page) ?? 1,
    pageSize: single(params.pageSize) ?? 25,
  });
  const { page, pageSize } = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 25 };

  const result = await listAuditEntries({ page, pageSize });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit log"
        description="A chronological record of sensitive workspace changes."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/settings">Back to settings</Link>
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {result.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ScrollText}
              title="No audit entries yet"
              description="Lead deletes, employee status changes, reassignments, settings changes and template edits appear here."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(entry.createdAt, settingsRow.timezone)}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">
                      {entry.actorName || entry.actorEmail || "System"}
                    </p>
                    {entry.actorEmail ? (
                      <p className="text-xs text-muted-foreground">
                        {entry.actorEmail}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{actionLabel(entry.action)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p className="font-medium">{entry.entity}</p>
                    {entry.entityId ? (
                      <p className="max-w-[14rem] truncate text-xs text-muted-foreground">
                        {entry.entityId}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {entry.details ? (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-primary">
                          View details
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-secondary/60 p-2 text-xs text-foreground">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Page {result.page} of {result.totalPages} · {result.total} entries
        </p>
        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className={
              result.page <= 1 ? "pointer-events-none opacity-50" : undefined
            }
          >
            <Link href={`/admin/audit?page=${Math.max(1, result.page - 1)}`}>
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className={
              result.page >= result.totalPages
                ? "pointer-events-none opacity-50"
                : undefined
            }
          >
            <Link
              href={`/admin/audit?page=${Math.min(
                result.totalPages,
                result.page + 1,
              )}`}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
