import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  FileText,
  MessageSquareReply,
  Percent,
  Send,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import {
  ChannelBreakdownChart,
  FunnelChart,
  MessagesBarChart,
  RepliesLineChart,
} from "@/components/dashboard/charts";
import { EmployeeStatusActions } from "@/components/admin/employee-status-actions";
import { EmployeeLeadsTable } from "@/components/admin/employee-leads-table";
import { requireAdmin } from "@/lib/auth";
import { getTeamMember, listEmployeeActivities } from "@/lib/admin";
import { getEmployeeDashboard } from "@/lib/dashboard";
import { listLeads } from "@/lib/leads";
import {
  formatDateTime,
  formatRelative,
  resolveDateRange,
} from "@/lib/date";
import { recomputeNoReplyStatuses } from "@/lib/no-reply";
import { getSettings } from "@/lib/settings";
import { dateRangeParamsSchema } from "@/lib/validation";
import {
  ACTIVITY_TYPE_LABELS,
  CHANNEL_LABELS,
  REPLY_TAG_LABELS,
  type DateRangeKey,
  type LeadStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminEmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const settingsRow = await getSettings();
  const member = await getTeamMember(id);
  if (!member) notFound();

  const parsed = dateRangeParamsSchema.safeParse({
    range: single(query.range) ?? "7d",
    from: single(query.from),
    to: single(query.to),
  });
  const rangeKey: DateRangeKey = parsed.success ? parsed.data.range : "7d";
  const range = resolveDateRange(rangeKey, settingsRow.timezone, {
    from: parsed.success ? parsed.data.from : undefined,
    to: parsed.success ? parsed.data.to : undefined,
  });

  await recomputeNoReplyStatuses(member.id);
  const [data, leadResult, activities] = await Promise.all([
    getEmployeeDashboard(
      member.id,
      { from: range.from, to: range.to },
      settingsRow.timezone,
    ),
    listLeads(
      member.id,
      { page: 1, pageSize: 20, sort: "created_at", dir: "desc" },
      settingsRow.timezone,
    ),
    listEmployeeActivities(member.id, 50),
  ]);

  const statusVariant =
    member.status === "active"
      ? "success"
      : member.status === "pending"
        ? "warning"
        : "destructive";

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/employees">
            <ArrowLeft className="h-4 w-4" />
            Back to employees
          </Link>
        </Button>
      </div>

      <PageHeader
        title={member.fullName || member.email}
        description={`${member.email} · ${member.role}`}
        actions={
          <>
            <Badge variant={statusVariant}>{member.status}</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/leads?owner=${member.id}`}>
                All leads
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <EmployeeStatusActions
              userId={member.id}
              status={member.status}
              role={member.role}
              name={member.fullName || member.email}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Read-only view of this employee&apos;s dashboard, leads, and activity.
        </p>
        <DateRangeFilter
          range={rangeKey}
          from={parsed.success ? parsed.data.from : undefined}
          to={parsed.success ? parsed.data.to : undefined}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Messages sent" value={data.totals.messages} icon={Send} />
        <KpiCard label="New leads" value={data.totals.newLeads} icon={UserPlus} />
        <KpiCard
          label="Replies"
          value={data.totals.replies}
          icon={MessageSquareReply}
          tone="clay"
        />
        <KpiCard
          label="Reply rate"
          value={`${data.totals.replyRate}%`}
          icon={Percent}
          tone="sky"
        />
        <KpiCard
          label="Calls booked"
          value={data.totals.calls}
          icon={CalendarCheck}
          tone="emerald"
        />
        <KpiCard
          label="Proposals sent"
          value={data.totals.proposals}
          icon={FileText}
        />
        <KpiCard
          label="Clients won"
          value={data.totals.won}
          icon={Trophy}
          tone="emerald"
        />
        <KpiCard
          label="Follow-ups due"
          value={data.followUps.length}
          icon={CalendarClock}
          tone="clay"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s targets</CardTitle>
            <CardDescription>Progress against daily targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Messages sent</span>
                <span className="text-muted-foreground">
                  {data.targets.messages.current} / {data.targets.messages.target}
                </span>
              </div>
              <Progress
                value={data.targets.messages.current}
                max={data.targets.messages.target}
                label="Daily messages target"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">New leads added</span>
                <span className="text-muted-foreground">
                  {data.targets.leads.current} / {data.targets.leads.target}
                </span>
              </div>
              <Progress
                value={data.targets.leads.current}
                max={data.targets.leads.target}
                label="Daily new leads target"
                indicatorClassName="bg-accent"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups due</CardTitle>
            <CardDescription>Due today or overdue.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.followUps.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="Nothing due"
                description="No follow-ups are due for this employee."
              />
            ) : (
              <ul className="space-y-2">
                {data.followUps.slice(0, 6).map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {lead.businessName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {CHANNEL_LABELS[lead.channel]} · due{" "}
                        {formatDateTime(
                          lead.nextFollowUpAt,
                          settingsRow.timezone,
                        )}
                      </p>
                    </div>
                    <StatusBadge status={lead.status as LeadStatus} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Messages sent per day</CardTitle>
            <CardDescription>First messages and follow-ups.</CardDescription>
          </CardHeader>
          <CardContent>
            <MessagesBarChart data={data.dailyMessages} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Replies per day</CardTitle>
            <CardDescription>Client replies logged each day.</CardDescription>
          </CardHeader>
          <CardContent>
            <RepliesLineChart data={data.dailyReplies} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Channel breakdown</CardTitle>
            <CardDescription>Messages and replies by channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChannelBreakdownChart data={data.channels} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Funnel</CardTitle>
            <CardDescription>From contacted to won.</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart
              data={data.funnel as { status: LeadStatus; value: number }[]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>No-reply leads</CardTitle>
            <CardDescription>
              Silent for {settingsRow.noReplyAfterDays}+ days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.noReply.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No stale leads"
                description="Every contacted lead is still within the follow-up window."
              />
            ) : (
              <ul className="space-y-2">
                {data.noReply.slice(0, 8).map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {lead.businessName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stage {lead.followUpStage} · updated{" "}
                        {formatRelative(lead.updatedAt, settingsRow.timezone)}
                      </p>
                    </div>
                    <StatusBadge status={lead.status as LeadStatus} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest logged actions in scope.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No activity yet"
                description="This employee has not logged outreach in this period."
              />
            ) : (
              <ul className="space-y-2">
                {data.recent.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {ACTIVITY_TYPE_LABELS[row.type]} ·{" "}
                        <span className="font-normal text-muted-foreground">
                          {row.businessName}
                        </span>
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatRelative(row.occurredAt, settingsRow.timezone)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Leads (read-only)</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/leads?owner=${member.id}`}>
              Open in team leads
            </Link>
          </Button>
        </div>
        <EmployeeLeadsTable
          leads={leadResult.rows}
          timeZone={settingsRow.timezone}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Activity log</h2>
          <p className="text-sm text-muted-foreground">
            The 50 most recent activities logged by this employee.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card">
          {activities.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Send}
                title="No activity"
                description="Activity appears here after the first message is logged."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(
                        activity.occurredAt,
                        settingsRow.timezone,
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ACTIVITY_TYPE_LABELS[activity.type]}
                    </TableCell>
                    <TableCell className="text-sm">
                      {activity.businessName}
                    </TableCell>
                    <TableCell className="text-sm">
                      {CHANNEL_LABELS[activity.channel]}
                    </TableCell>
                    <TableCell className="max-w-md text-sm text-muted-foreground">
                      {activity.replyText ? (
                        <span>
                          “{activity.replyText}”
                          {activity.replyTag
                            ? ` (${REPLY_TAG_LABELS[activity.replyTag]})`
                            : ""}
                        </span>
                      ) : (
                        activity.note || "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
