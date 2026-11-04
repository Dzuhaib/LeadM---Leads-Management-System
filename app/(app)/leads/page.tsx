import Link from "next/link";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { ImportLeadsDialog } from "@/components/leads/import-leads-dialog";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { requireActiveUser } from "@/lib/auth";
import { getLeadFacets, listLeads } from "@/lib/leads";
import { recomputeNoReplyStatuses } from "@/lib/no-reply";
import { getSettings } from "@/lib/settings";
import { leadListParamsSchema } from "@/lib/validation";

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
  return `/leads?${search.toString()}`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireActiveUser();
  const params = await searchParams;
  const settingsRow = await getSettings();

  const parsed = leadListParamsSchema.safeParse({
    page: single(params.page) ?? 1,
    pageSize: single(params.pageSize) ?? 10,
    q: single(params.q),
    status: single(params.status),
    channel: single(params.channel),
    industry: single(params.industry),
    country: single(params.country),
    due: single(params.due),
    from: single(params.from),
    to: single(params.to),
    sort: single(params.sort) ?? "created_at",
    dir: single(params.dir) ?? "desc",
  });

  const query = parsed.success
    ? parsed.data
    : leadListParamsSchema.parse({ page: 1, pageSize: 10 });

  await recomputeNoReplyStatuses(user.id);

  const [result, facets] = await Promise.all([
    listLeads(user.id, query, settingsRow.timezone),
    getLeadFacets(user.id),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description="Your outreach pipeline. Duplicate checks run across the whole team."
        actions={
          <>
            <ImportLeadsDialog />
            <Button asChild variant="outline">
              <a href="/api/export" download>
                <Download className="h-4 w-4" />
                Export
              </a>
            </Button>
            <LeadFormDialog />
          </>
        }
      />

      <LeadsFilters
        values={{
          q: query.q,
          status: query.status,
          channel: query.channel,
          industry: query.industry,
          country: query.country,
          due: query.due,
          from: query.from,
          to: query.to,
          sort: query.sort,
          dir: query.dir,
        }}
        industries={facets.industries}
        countries={facets.countries}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {result.total} lead{result.total === 1 ? "" : "s"} found
        </p>
        <p>
          Page {result.page} of {result.totalPages}
        </p>
      </div>

      <LeadsTable leads={result.rows} timeZone={settingsRow.timezone} />

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

      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        Privacy note: only store the client information you need for outreach,
        and follow the privacy and messaging laws of the countries you contact.
      </p>
    </div>
  );
}
