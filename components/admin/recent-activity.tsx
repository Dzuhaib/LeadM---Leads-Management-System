"use client";

import Link from "next/link";
import { ArrowUpRight, Radio, Send, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelative } from "@/lib/date";
import {
  CHANNEL_LABELS,
  type ActivityType,
  type Channel,
  type LeadStatus,
} from "@/lib/constants";

type RecentLead = {
  id: string;
  businessName: string;
  serviceWanted: string | null;
  channel: Channel;
  status: LeadStatus;
  createdAt: Date;
  ownerName: string;
  ownerEmail: string;
};

type RecentMessage = {
  id: string;
  leadId: string;
  businessName: string;
  serviceWanted: string | null;
  type: ActivityType;
  channel: Channel;
  occurredAt: Date;
  ownerName: string;
  ownerEmail: string;
};

function Count({ value }: { value: number }) {
  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
      {value}
    </span>
  );
}

function ActivityTag({
  kind,
}: {
  kind: "new" | "message";
}) {
  if (kind === "new") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <UserPlus className="h-3 w-3" />
        New
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
      <Send className="h-3 w-3" />
      Message sent
    </span>
  );
}

export function RecentActivityTabs({
  newLeads,
  messages,
  timeZone,
}: {
  newLeads: RecentLead[];
  messages: RecentMessage[];
  timeZone: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Latest team activity</CardTitle>
          <CardDescription>
            Newly added leads and messages sent by the team.
          </CardDescription>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Radio className="h-3 w-3" />
          Live
        </span>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leads">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-secondary p-1 sm:w-auto">
            <TabsTrigger
              value="leads"
              className="gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-card"
            >
              <span className="nav-icon-3d flex h-6 w-6 items-center justify-center rounded-md text-blue-600 dark:text-blue-300">
                <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              New leads
              <Count value={newLeads.length} />
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="gap-2 rounded-lg px-3 py-2 data-[state=active]:bg-card"
            >
              <span className="nav-icon-3d flex h-6 w-6 items-center justify-center rounded-md text-emerald-600 dark:text-emerald-300">
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              Message sent
              <Count value={messages.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-2">
            {newLeads.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No new leads in this scope yet.
              </p>
            ) : (
              newLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads?q=${encodeURIComponent(lead.businessName)}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="nav-icon-3d flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-blue-600 dark:text-blue-300">
                    <UserPlus className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {lead.businessName}
                      </span>
                      <ActivityTag kind="new" />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {lead.serviceWanted || "No service noted"} ·{" "}
                      {CHANNEL_LABELS[lead.channel]}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {lead.ownerName || lead.ownerEmail} ·{" "}
                      {formatRelative(lead.createdAt, timeZone)}
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-2">
            {messages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No messages sent in this scope yet.
              </p>
            ) : (
              messages.map((message) => (
                <Link
                  key={message.id}
                  href={`/admin/leads?q=${encodeURIComponent(message.businessName)}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="nav-icon-3d flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-emerald-600 dark:text-emerald-300">
                    <Send className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {message.businessName}
                      </span>
                      <ActivityTag kind="message" />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {message.serviceWanted || "No service noted"} ·{" "}
                      {CHANNEL_LABELS[message.channel]}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {message.ownerName || message.ownerEmail} ·{" "}
                      {formatRelative(message.occurredAt, timeZone)}
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
