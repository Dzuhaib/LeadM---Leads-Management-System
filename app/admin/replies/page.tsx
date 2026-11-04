import Link from "next/link";
import { Inbox, MessageSquareReply, UserX } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { LeadDetailDialog } from "@/components/leads/lead-detail-dialog";
import { ReassignLeadButton } from "@/components/admin/reassign-lead-button";
import { SendBackButton } from "@/components/admin/send-back-button";
import { requireAdmin } from "@/lib/auth";
import {
  listAdminNoReplies,
  listAdminReplies,
  listAssignableEmployeesForAdmin,
  listTeamMembers,
} from "@/lib/admin";
import { formatDateTime } from "@/lib/date";
import { recomputeNoReplyStatuses } from "@/lib/no-reply";
import { getSettings } from "@/lib/settings";
import { adminRepliesParamsSchema } from "@/lib/validation";
import {
  CHANNELS,
  CHANNEL_LABELS,
  REPLY_TAGS,
  REPLY_TAG_LABELS,
  type Channel,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminRepliesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settingsRow = await getSettings();

  const parsed = adminRepliesParamsSchema.safeParse({
    tab: single(params.tab) ?? "replies",
    employee: single(params.employee) || undefined,
    channel: single(params.channel) || undefined,
    tag: single(params.tag) || undefined,
    from: single(params.from) || undefined,
    to: single(params.to) || undefined,
    sort: single(params.sort) ?? "oldest",
  });
  const query = parsed.success
    ? parsed.data
    : adminRepliesParamsSchema.parse({});

  if (query.tab === "no_reply") {
    await recomputeNoReplyStatuses(query.employee);
  }

  const [members, assignable, replies, noReplies] = await Promise.all([
    listTeamMembers(),
    listAssignableEmployeesForAdmin(),
    query.tab === "replies"
      ? listAdminReplies(query, settingsRow.timezone)
      : Promise.resolve([]),
    query.tab === "no_reply"
      ? listAdminNoReplies(query, settingsRow.timezone)
      : Promise.resolve([]),
  ]);

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active ? "bg-card text-foreground" : "text-muted-foreground"
    }`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Replies and no-replies"
        description="Review client replies and rescue stale conversations."
      />

      <div
        role="tablist"
        aria-label="Reply views"
        className="inline-flex rounded-lg bg-muted p-1"
      >
        <Link
          href="/admin/replies?tab=replies"
          role="tab"
          aria-selected={query.tab === "replies"}
          className={tabClass(query.tab === "replies")}
        >
          <MessageSquareReply className="h-4 w-4" />
          Replies
        </Link>
        <Link
          href="/admin/replies?tab=no_reply"
          role="tab"
          aria-selected={query.tab === "no_reply"}
          className={tabClass(query.tab === "no_reply")}
        >
          <UserX className="h-4 w-4" />
          No reply
        </Link>
      </div>

      {query.tab === "replies" ? (
        <>
          <form
            method="get"
            className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 xl:grid-cols-7"
          >
            <input type="hidden" name="tab" value="replies" />
            <Select
              name="employee"
              defaultValue={query.employee ?? ""}
              aria-label="Filter by employee"
            >
              <option value="">All employees</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName || member.email}
                </option>
              ))}
            </Select>
            <Select
              name="channel"
              defaultValue={query.channel ?? ""}
              aria-label="Filter by channel"
            >
              <option value="">Any channel</option>
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </Select>
            <Select
              name="tag"
              defaultValue={query.tag ?? ""}
              aria-label="Filter by reply tag"
            >
              <option value="">Any tag</option>
              {REPLY_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {REPLY_TAG_LABELS[tag]}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              name="from"
              defaultValue={query.from ?? ""}
              aria-label="Replies from date"
            />
            <Input
              type="date"
              name="to"
              defaultValue={query.to ?? ""}
              aria-label="Replies to date"
            />
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm">
                Filter
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/admin/replies?tab=replies">Clear</Link>
              </Button>
            </div>
          </form>

          <div className="rounded-lg border border-border bg-card">
            {replies.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Inbox}
                  title="No replies match these filters"
                  description="Try a wider date range or clear the filters."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reply</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {replies.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <LeadDetailDialog
                          leadId={row.leadId}
                          businessName={row.businessName}
                          timeZone={settingsRow.timezone}
                          trigger={
                            <button
                              type="button"
                              className="text-left font-semibold"
                            >
                              {row.businessName}
                            </button>
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          {row.contactName || "No contact name"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {row.employeeName || row.employeeEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.employeeEmail}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {CHANNEL_LABELS[row.channel as Channel]}
                      </TableCell>
                      <TableCell>
                        {row.replyTag ? (
                          <Badge variant="secondary">
                            {REPLY_TAG_LABELS[row.replyTag]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(row.occurredAt, settingsRow.timezone)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="whitespace-pre-wrap text-sm">
                          {row.replyText || "—"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      ) : (
        <>
          <form
            method="get"
            className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 xl:grid-cols-5"
          >
            <input type="hidden" name="tab" value="no_reply" />
            <Select
              name="employee"
              defaultValue={query.employee ?? ""}
              aria-label="Filter by employee"
            >
              <option value="">All employees</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName || member.email}
                </option>
              ))}
            </Select>
            <Select
              name="channel"
              defaultValue={query.channel ?? ""}
              aria-label="Filter by channel"
            >
              <option value="">Any channel</option>
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </Select>
            <Select
              name="sort"
              defaultValue={query.sort}
              aria-label="Sort no-reply leads"
            >
              <option value="oldest">Sort: oldest contact</option>
              <option value="newest">Sort: newest contact</option>
              <option value="stage">Sort: follow-up stage</option>
            </Select>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm">
                Filter
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/admin/replies?tab=no_reply">Clear</Link>
              </Button>
            </div>
          </form>

          <div className="rounded-lg border border-border bg-card">
            {noReplies.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={UserX}
                  title="No stale leads"
                  description={`No lead has been silent for ${settingsRow.noReplyAfterDays} days.`}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Last message</TableHead>
                    <TableHead className="text-right">Stage</TableHead>
                    <TableHead className="text-right">Days since</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noReplies.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <LeadDetailDialog
                          leadId={row.id}
                          businessName={row.businessName}
                          timeZone={settingsRow.timezone}
                          trigger={
                            <button
                              type="button"
                              className="text-left font-semibold"
                            >
                              {row.businessName}
                            </button>
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          {row.contactName || "No contact name"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {row.ownerName || row.ownerEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.ownerEmail}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {CHANNEL_LABELS[row.channel as Channel]}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(row.lastMessageAt, settingsRow.timezone)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.followUpStage}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            row.daysSinceContact >= 21
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {row.daysSinceContact}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <SendBackButton
                            leadId={row.id}
                            businessName={row.businessName}
                          />
                          <ReassignLeadButton
                            leadIds={[row.id]}
                            employees={assignable}
                            currentOwnerId={row.ownerId}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
