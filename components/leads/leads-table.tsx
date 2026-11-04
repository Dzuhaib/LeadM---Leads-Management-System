"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { LeadDetailDialog } from "@/components/leads/lead-detail-dialog";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { bulkUpdateLeadStatus } from "@/actions/leads";
import {
  CHANNEL_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/date";
import type { Lead } from "@/db/schema";

export function LeadsTable({
  leads,
  timeZone,
}: {
  leads: Lead[];
  timeZone: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = React.useState<LeadStatus>("contacted");
  const [pending, startTransition] = React.useTransition();

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === leads.length
        ? new Set()
        : new Set(leads.map((lead) => lead.id)),
    );
  }

  function applyBulkStatus() {
    startTransition(async () => {
      const result = await bulkUpdateLeadStatus({
        leadIds: Array.from(selected),
        status: bulkStatus,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Updated ${selected.size} lead(s).`);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No leads match these filters"
        description="Try clearing the filters, or add your first lead to start outreach."
        action={<LeadFormDialog />}
      />
    );
  }

  const allSelected = selected.size === leads.length;

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {selected.size} lead{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <Select
                aria-label="Bulk status"
                value={bulkStatus}
                onChange={(event) =>
                  setBulkStatus(event.target.value as LeadStatus)
                }
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={applyBulkStatus}
              disabled={pending}
            >
              Apply status
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href={`/api/export?ids=${Array.from(selected).join(",")}`}
                download
              >
                <Download className="h-3.5 w-3.5" />
                Export selected
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all leads on this page"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-border accent-[#7C3AED]"
                />
              </TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Next follow-up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select ${lead.businessName}`}
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                    className="h-4 w-4 rounded border-border accent-[#7C3AED]"
                  />
                </TableCell>
                <TableCell>
                  <LeadDetailDialog
                    leadId={lead.id}
                    businessName={lead.businessName}
                    timeZone={timeZone}
                    trigger={
                      <button
                        type="button"
                        className="text-left font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {lead.businessName}
                      </button>
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {lead.contactName || "No contact name"}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  {CHANNEL_LABELS[lead.channel]}
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lead.servicePitched}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(lead.nextFollowUpAt, timeZone)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <LeadQuickActions leadId={lead.id} />
                    <LeadFormDialog
                      lead={lead}
                      variant="ghost"
                      size="icon"
                    />
                    <DeleteLeadButton
                      leadId={lead.id}
                      businessName={lead.businessName}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
