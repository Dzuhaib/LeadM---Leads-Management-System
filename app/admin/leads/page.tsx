import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AdminLeadsTable } from "@/components/admin/admin-leads-table";
import { requireAdmin } from "@/lib/auth";
import {
  listAdminLeads,
  listAssignableEmployeesForAdmin,
  listTeamMembers,
} from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { adminLeadListParamsSchema } from "@/lib/validation";
import {
  CHANNELS,
  CHANNEL_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(params: SearchParams, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = single(value);
    if (text && key !== "page") search.set(key, text);
  }
  search.set("page", String(page));
  return `/admin/leads?${search.toString()}`;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settingsRow = await getSettings();

  const parsed = adminLeadListParamsSchema.safeParse({
    page: single(params.page) ?? 1,
    pageSize: single(params.pageSize) ?? 10,
    q: single(params.q),
    owner: single(params.owner) || undefined,
    status: single(params.status) || undefined,
    channel: single(params.channel) || undefined,
    sort: single(params.sort) ?? "created_at",
    dir: single(params.dir) ?? "desc",
  });

  const query = parsed.success
    ? parsed.data
    : adminLeadListParamsSchema.parse({});

  const [result, members, assignable] = await Promise.all([
    listAdminLeads(query, settingsRow.timezone),
    listTeamMembers(),
    listAssignableEmployeesForAdmin(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team leads"
        description="Every lead across the team. Edit, delete, or reassign ownership."
      />

      <form
        method="get"
        className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 xl:grid-cols-6"
      >
        <Input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Search business, contact, owner…"
          aria-label="Search leads"
        />
        <Select
          name="owner"
          defaultValue={query.owner ?? ""}
          aria-label="Filter by owner"
        >
          <option value="">All owners</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName || member.email}
            </option>
          ))}
        </Select>
        <Select
          name="status"
          defaultValue={query.status ?? ""}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LEAD_STATUS_LABELS[status]}
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
          aria-label="Sort leads by"
        >
          <option value="created_at">Sort: date added</option>
          <option value="business_name">Sort: business</option>
          <option value="owner">Sort: owner</option>
          <option value="status">Sort: status</option>
          <option value="next_follow_up_at">Sort: follow-up</option>
        </Select>
        <div className="flex items-center gap-2">
          <Select
            name="dir"
            defaultValue={query.dir}
            aria-label="Sort direction"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </Select>
          <Button type="submit" size="sm">
            Filter
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/leads">Clear</Link>
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {result.total} lead{result.total === 1 ? "" : "s"} found
        </p>
        <p>
          Page {result.page} of {result.totalPages}
        </p>
      </div>

      <AdminLeadsTable
        leads={result.rows}
        employees={assignable}
        timeZone={settingsRow.timezone}
      />

      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="outline"
          size="sm"
          aria-disabled={result.page <= 1}
          className={result.page <= 1 ? "pointer-events-none opacity-50" : ""}
        >
          <Link href={buildHref(params, Math.max(1, result.page - 1))}>
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          aria-disabled={result.page >= result.totalPages}
          className={
            result.page >= result.totalPages
              ? "pointer-events-none opacity-50"
              : ""
          }
        >
          <Link
            href={buildHref(
              params,
              Math.min(result.totalPages, result.page + 1),
            )}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
