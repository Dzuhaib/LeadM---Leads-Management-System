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
import { CHANNEL_LABELS, type LeadStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/date";
import type { Lead } from "@/db/schema";

export function EmployeeLeadsTable({
  leads,
  timeZone,
}: {
  leads: Lead[];
  timeZone: string;
}) {
  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads owned"
        description="This employee has not added any leads yet."
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Service wanted</TableHead>
            <TableHead>Next follow-up</TableHead>
            <TableHead className="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <p className="font-semibold">{lead.businessName}</p>
                <p className="text-xs text-muted-foreground">
                  {lead.serviceWanted ||
                    lead.email ||
                    lead.phone ||
                    "No service noted"}
                </p>
              </TableCell>
              <TableCell className="text-sm">
                {CHANNEL_LABELS[lead.channel]}
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.status as LeadStatus} />
              </TableCell>
              <TableCell className="text-sm">
                <p>{lead.serviceWanted || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Pitched: {lead.servicePitched}
                </p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(lead.nextFollowUpAt, timeZone)}
              </TableCell>
              <TableCell className="text-right">
                <LeadDetailDialog
                  leadId={lead.id}
                  businessName={lead.businessName}
                  timeZone={timeZone}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
