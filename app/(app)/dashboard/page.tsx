import {
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { LogFollowUpButton } from "@/components/activities/log-follow-up-button";
import { requireActiveUser } from "@/lib/auth";
import { getEmployeeDashboard } from "@/lib/dashboard";
import { resolveDateRange, formatDateTime, formatRelative } from "@/lib/date";
import { recomputeNoReplyStatuses } from "@/lib/no-reply";
import { getSettings } from "@/lib/settings";
import { dateRangeParamsSchema } from "@/lib/validation";
import {
  ACTIVITY_TYPE_LABELS,
  CHANNEL_LABELS,
  type DateRangeKey,
  type LeadStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireActiveUser();
  const params = await searchParams;
  const settingsRow = await getSettings();

  const parsed = dateRangeParamsSchema.safeParse({
    range: single(params.range) ?? "7d",
    from: single(params.from),
    to: single(params.to),
  });
  const rangeKey: DateRangeKey = parsed.success ? parsed.data.range : "7d";
  const range = resolveDateRange(rangeKey, settingsRow.timezone, {
    from: parsed.success ? parsed.data.from : undefined,
    to: parsed.success ? parsed.data.to : undefined,
  });

  await recomputeNoReplyStatuses(user.id);
  const data = await getEmployeeDashboard(
    user.id,
    { from: range.from, to: range.to },
    settingsRow.timezone,
  );

  const replyRate = `${data.totals.replyRate}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.fullName.split(" ")[0] || "there"}`}
        description="Your personal outreach performance and follow-ups due."
        actions={
          <DateRangeFilter
            range={rangeKey}
            from={parsed.success ? parsed.data.from : undefined}
            to={parsed.success ? parsed.data.to : undefined}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Messages sent"
          value={data.totals.messages}
          hint="First messages + follow-ups"
          icon={Send}
        />
        <KpiCard
          label="New leads"
          value={data.totals.newLeads}
          hint="Added in this period"
          icon={UserPlus}
        />
        <KpiCard
          label="Replies"
          value={data.totals.replies}
          hint={`Reply rate ${replyRate}`}
          icon={MessageSquareReply}
          tone="clay"
        />
        <KpiCard
          label="Reply rate"
          value={replyRate}
          hint="Replies ÷ messages"
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
          hint="Due today or overdue"
          icon={CalendarClock}
          tone="clay"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s targets</CardTitle>
            <CardDescription>Progress against your daily targets.</CardDescription>
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
            <CardDescription>
              Mark a follow-up as sent in one click.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.followUps.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="Nothing due right now"
                description="New follow-ups will appear here on day 3, 7 and 14."
              />
            ) : (
              <ul className="space-y-2">
                {data.followUps.slice(0, 6).map((lead) => (
                  <li
                    key={lead.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {lead.businessName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {CHANNEL_LABELS[lead.channel]} · due{" "}
                        {formatDateTime(lead.nextFollowUpAt, settingsRow.timezone)}
                      </p>
                    </div>
                    <LogFollowUpButton leadId={lead.id} />
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
            <CardDescription>First messages and follow-ups combined.</CardDescription>
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
              No reply after {settingsRow.noReplyAfterDays} days from the last
              message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.noReply.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No stale leads"
                description="Every contacted lead has either replied or is still within the follow-up window."
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
                        Stage {lead.followUpStage} · last update{" "}
                        {formatRelative(lead.updatedAt, settingsRow.timezone)}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Your latest logged actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No activity yet"
                description="Add a lead, then log your first message to see it here."
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
                    {row.replyText ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        “{row.replyText}”
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
