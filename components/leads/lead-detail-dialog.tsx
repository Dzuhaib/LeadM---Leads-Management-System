"use client";

import * as React from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { getLeadDetail } from "@/actions/leads";
import {
  ACTIVITY_TYPE_LABELS,
  CHANNEL_LABELS,
  REPLY_TAG_LABELS,
  type ActivityType,
  type LeadStatus,
  type ReplyTag,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/date";
import type { Lead } from "@/db/schema";

type TimelineRow = {
  id: string;
  type: ActivityType;
  channel: string;
  replyText: string | null;
  replyTag: ReplyTag | null;
  note: string | null;
  occurredAt: Date;
  userName: string;
};

export function LeadDetailDialog({
  leadId,
  businessName,
  timeZone,
  trigger,
}: {
  leadId: string;
  businessName: string;
  timeZone: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lead, setLead] = React.useState<Lead | null>(null);
  const [timeline, setTimeline] = React.useState<TimelineRow[]>([]);

  function loadLead() {
    setLoading(true);
    setError(null);
    getLeadDetail(leadId)
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
        } else if (result.data) {
          setLead(result.data.lead);
          setTimeline(result.data.timeline as TimelineRow[]);
        }
      })
      .finally(() => setLoading(false));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) loadLead();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="ghost" size="sm">
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="left-auto right-0 top-0 h-full max-h-full w-full max-w-xl translate-x-0 translate-y-0 rounded-none rounded-l-lg border-y-0 border-r-0 sm:w-full">
        <DialogHeader>
          <DialogTitle>{lead?.businessName ?? businessName}</DialogTitle>
          <DialogDescription>
            {lead?.serviceWanted ? `${lead.serviceWanted} · ` : ""}
            {lead?.contactName ? `${lead.contactName} · ` : ""}
            {lead ? `${CHANNEL_LABELS[lead.channel]} outreach` : "Lead details"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading lead…
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : lead ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={lead.status as LeadStatus} />
              <span className="text-xs text-muted-foreground">
                {lead.servicePitched}
              </span>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail
                label="Service wanted"
                value={lead.serviceWanted || "—"}
              />
              <Detail
                label="Service pitched"
                value={lead.servicePitched || "—"}
              />
              <Detail
                label="Follow-up stage"
                value={`${lead.followUpStage} / 3`}
              />
              <Detail
                label="Next follow-up"
                value={formatDateTime(lead.nextFollowUpAt, timeZone)}
              />
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Source URL
                </p>
                {lead.profileUrl ? (
                  <a
                    href={
                      lead.profileUrl.includes("://")
                        ? lead.profileUrl
                        : `https://${lead.profileUrl}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary underline-offset-4"
                  >
                    {lead.profileUrl}
                  </a>
                ) : (
                  <p>—</p>
                )}
              </div>
              <Detail label="Email" value={lead.email || "—"} />
              <Detail label="Phone" value={lead.phone || "—"} />
            </div>

            {lead.observation ? (
              <div className="rounded-md bg-secondary/60 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Observation
                </p>
                <p className="whitespace-pre-wrap">{lead.observation}</p>
              </div>
            ) : null}

            {lead.notes ? (
              <div className="rounded-md bg-secondary/60 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </p>
                <p className="whitespace-pre-wrap">{lead.notes}</p>
              </div>
            ) : null}

            <Separator />

            <div>
              <p className="mb-3 text-sm font-semibold">Activity timeline</p>
              {timeline.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No activity logged yet. Log the first message to start the
                  follow-up sequence.
                </p>
              ) : (
                <ol className="space-y-3">
                  {timeline.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {ACTIVITY_TYPE_LABELS[row.type] ?? row.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(row.occurredAt, timeZone)}
                        </span>
                      </div>
                      {row.replyText ? (
                        <p className="mt-2 rounded bg-secondary/60 p-2 text-sm">
                          “{row.replyText}”
                          {row.replyTag ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({REPLY_TAG_LABELS[row.replyTag]})
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      {row.note ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {row.note}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        by {row.userName}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="break-words">{value}</p>
    </div>
  );
}
