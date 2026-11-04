import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  CalendarCheck,
  CalendarClock,
  FileText,
  MessageSquareReply,
  Percent,
  Send,
  Trophy,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";
import { FunnelChart } from "@/components/dashboard/charts";
import { EmployeeFilter } from "@/components/admin/employee-filter";
import { PerformanceTable } from "@/components/admin/performance-table";
import { RecentActivityTabs } from "@/components/admin/recent-activity";
import { TeamMessagesStackedChart } from "@/components/admin/team-charts";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/admin";
import { formatDateTime, resolveDateRange } from "@/lib/date";
import { recomputeNoReplyStatuses } from "@/lib/no-reply";
import { getSettings } from "@/lib/settings";
import { adminDashboardParamsSchema } from "@/lib/validation";
import {
  CHANNEL_LABELS,
  type DateRangeKey,
  type LeadStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settingsRow = await getSettings();

  const parsed = adminDashboardParamsSchema.safeParse({
    range: single(params.range) ?? "7d",
    from: single(params.from),
    to: single(params.to),
    employee: single(params.employee) || undefined,
  });

  const rangeKey: DateRangeKey = parsed.success ? parsed.data.range : "7d";
  const employeeId = parsed.success ? parsed.data.employee : undefined;
  const range = resolveDateRange(rangeKey, settingsRow.timezone, {
    from: parsed.success ? parsed.data.from : undefined,
    to: parsed.success ? parsed.data.to : undefined,
  });

  await recomputeNoReplyStatuses(employeeId);
  const data = await getAdminDashboard({
    range: { from: range.from, to: range.to },
    timeZone: settingsRow.timezone,
    employeeId,
  });
  const selected = data.members[0];
  const noReplyTotal = data.performance.reduce(
    (sum, row) => sum + row.noReply,
    0,
  );
  const overdueTotal = data.performance.reduce(
    (sum, row) => sum + row.overdue,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team overview"
        description={
          selected
            ? `Team performance for ${selected.fullName || selected.email}.`
            : "Team-wide outreach performance, replies, and follow-up health."
        }
        actions={
          <>
            <DateRangeFilter
              range={rangeKey}
              from={parsed.success ? parsed.data.from : undefined}
              to={parsed.success ? parsed.data.to : undefined}
            />
            <EmployeeFilter members={data.allMembers} value={employeeId} />
          </>
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
          hint={`Reply rate ${data.totals.replyRate}%`}
          icon={MessageSquareReply}
          tone="clay"
        />
        <KpiCard
          label="Reply rate"
          value={`${data.totals.replyRate}%`}
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
          label="No-reply leads"
          value={noReplyTotal}
          hint="Current pipeline"
          icon={UserX}
          tone="clay"
        />
        <KpiCard
          label="Overdue follow-ups"
          value={overdueTotal}
          hint="Current pipeline"
          icon={CalendarClock}
          tone="clay"
        />
      </div>

      <RecentActivityTabs
        newLeads={data.recentLeads}
        messages={data.recentMessages}
        timeZone={settingsRow.timezone}
      />

      <Card>
        <CardHeader>
          <CardTitle>Messages per employee per day</CardTitle>
          <CardDescription>
            Stacked first messages and follow-ups for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMessagesStackedChart
            members={data.members}
            data={data.dailyByEmployee}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily message table</CardTitle>
          <CardDescription>
            Rows are team members, columns are days in the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.members.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No team members in scope"
                description="Approve employees to see their daily activity here."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-max">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-card">
                      Employee
                    </TableHead>
                    {data.days.map((day) => (
                      <TableHead key={day} className="text-right">
                        {format(parseISO(day), "d MMM")}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.map((member) => {
                    const total = data.dailyByEmployee.reduce(
                      (sum, row) => sum + Number(row[member.id] ?? 0),
                      0,
                    );
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="sticky left-0 z-10 bg-card font-medium">
                          <Link
                            href={`/admin/employees/${member.id}`}
                            className="font-medium"
                          >
                            {member.fullName || member.email}
                          </Link>
                        </TableCell>
                        {data.days.map((day) => {
                          const row = data.dailyByEmployee.find(
                            (entry) => entry.day === day,
                          );
                          return (
                            <TableCell
                              key={day}
                              className="text-right tabular-nums"
                            >
                              {Number(row?.[member.id] ?? 0) || "·"}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-semibold tabular-nums">
                          {total}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee performance</CardTitle>
          <CardDescription>
            Sortable performance for the selected period. Daily message target:
            {" "}
            {settingsRow.dailyMessagesTarget}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PerformanceTable
            rows={data.performance}
            target={settingsRow.dailyMessagesTarget}
            timeZone={settingsRow.timezone}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>
              Top performers by messages in this period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.leaderboard.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No activity yet"
                description="The leaderboard fills up as employees log outreach."
              />
            ) : (
              <ol className="space-y-2">
                {data.leaderboard.map((row, index) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/employees/${row.id}`}
                          className="truncate text-sm font-semibold"
                        >
                          {row.fullName || row.email}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {row.replies} replies · {row.won} won
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {row.messages}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team funnel</CardTitle>
            <CardDescription>Current pipeline across the team.</CardDescription>
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
            <CardTitle>Channel performance</CardTitle>
            <CardDescription>
              Messages, replies, and reply rate by channel.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Replies</TableHead>
                  <TableHead className="text-right">Reply rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.channels.map((row) => (
                  <TableRow key={row.channel}>
                    <TableCell className="font-medium">
                      {CHANNEL_LABELS[row.channel]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.messages}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.replies}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.replyRate}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top industries</CardTitle>
              <CardDescription>Industries with the most replies.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.industries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No replied leads with an industry yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.industries.map((row) => (
                    <li
                      key={row.name}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{row.name}</span>
                      <span className="font-semibold tabular-nums">
                        {row.replies}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top services</CardTitle>
              <CardDescription>Services with the most replies.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No replied leads with a service yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.services.map((row) => (
                    <li
                      key={row.name}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{row.name}</span>
                      <span className="font-semibold tabular-nums">
                        {row.replies}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up health</CardTitle>
          <CardDescription>
            Current no-reply and overdue follow-up totals per employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">No reply</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.performance.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/employees/${row.id}`}
                      className="font-medium"
                    >
                      {row.fullName || row.email}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.noReply}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.overdue}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatDateTime(row.lastActive, settingsRow.timezone)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        <Users className="h-4 w-4" />
        All admin metrics use SQL aggregates over team activity. Employee
        dashboards and leads remain read-only when opened from here.
      </p>
    </div>
  );
}
