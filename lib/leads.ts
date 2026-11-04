import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { activities, leads, users, type Lead } from "@/db/schema";
import { fromZonedTime } from "date-fns-tz";
import { zonedDayBounds } from "./date";
import type { LeadListParams } from "./validation";

export type LeadListResult = {
  rows: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listLeads(
  ownerId: string,
  params: LeadListParams,
  timeZone: string,
): Promise<LeadListResult> {
  const filters: SQL[] = [
    eq(leads.ownerId, ownerId),
    isNull(leads.deletedAt),
  ];

  if (params.q) {
    const query = `%${params.q}%`;
    filters.push(
      or(
        ilike(leads.businessName, query),
        ilike(leads.contactName, query),
        ilike(leads.industry, query),
        ilike(leads.email, query),
        ilike(leads.country, query),
      )!,
    );
  }
  if (params.status) filters.push(eq(leads.status, params.status));
  if (params.channel) filters.push(eq(leads.channel, params.channel));
  if (params.industry) filters.push(eq(leads.industry, params.industry));
  if (params.country) filters.push(eq(leads.country, params.country));

  if (params.due === "today") {
    const bounds = zonedDayBounds(new Date(), timeZone);
    filters.push(gte(leads.nextFollowUpAt, bounds.start));
    filters.push(lte(leads.nextFollowUpAt, bounds.end));
  } else if (params.due === "overdue") {
    filters.push(lt(leads.nextFollowUpAt, new Date()));
  }

  if (params.from) {
    const start = fromZonedTime(`${params.from}T00:00:00`, timeZone);
    if (!Number.isNaN(start.getTime())) filters.push(gte(leads.createdAt, start));
  }
  if (params.to) {
    const end = fromZonedTime(`${params.to}T23:59:59.999`, timeZone);
    if (!Number.isNaN(end.getTime())) filters.push(lte(leads.createdAt, end));
  }

  const where = and(...filters);
  const sortColumn =
    params.sort === "business_name"
      ? leads.businessName
      : params.sort === "status"
        ? leads.status
        : params.sort === "next_follow_up_at"
          ? leads.nextFollowUpAt
          : leads.createdAt;
  const order = params.dir === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (params.page - 1) * params.pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(where)
      .orderBy(order)
      .limit(params.pageSize)
      .offset(offset),
    db.select({ value: count() }).from(leads).where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    rows,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getLeadById(id: string, ownerId?: string) {
  const filters: SQL[] = [eq(leads.id, id), isNull(leads.deletedAt)];
  if (ownerId) filters.push(eq(leads.ownerId, ownerId));
  const rows = await db
    .select()
    .from(leads)
    .where(and(...filters))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLeadTimeline(leadId: string) {
  return db
    .select({
      id: activities.id,
      type: activities.type,
      channel: activities.channel,
      replyText: activities.replyText,
      replyTag: activities.replyTag,
      note: activities.note,
      occurredAt: activities.occurredAt,
      userName: users.fullName,
    })
    .from(activities)
    .innerJoin(users, eq(activities.userId, users.id))
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.occurredAt))
    .limit(100);
}

export async function getLeadFacets(ownerId: string) {
  const [industries, countries] = await Promise.all([
    db
      .selectDistinct({ value: leads.industry })
      .from(leads)
      .where(
        and(
          eq(leads.ownerId, ownerId),
          isNull(leads.deletedAt),
          sql`${leads.industry} is not null and ${leads.industry} <> ''`,
        ),
      )
      .orderBy(asc(leads.industry)),
    db
      .selectDistinct({ value: leads.country })
      .from(leads)
      .where(
        and(
          eq(leads.ownerId, ownerId),
          isNull(leads.deletedAt),
          sql`${leads.country} is not null and ${leads.country} <> ''`,
        ),
      )
      .orderBy(asc(leads.country)),
  ]);

  return {
    industries: industries
      .map((row) => row.value)
      .filter((value): value is string => Boolean(value)),
    countries: countries
      .map((row) => row.value)
      .filter((value): value is string => Boolean(value)),
  };
}

export async function getFollowUpsDue(ownerId: string, timeZone: string) {
  const bounds = zonedDayBounds(new Date(), timeZone);
  return db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.ownerId, ownerId),
        isNull(leads.deletedAt),
        sql`${leads.nextFollowUpAt} is not null`,
        lte(leads.nextFollowUpAt, bounds.end),
      ),
    )
    .orderBy(asc(leads.nextFollowUpAt))
    .limit(25);
}

export async function getNoReplyLeads(ownerId: string) {
  return db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.ownerId, ownerId),
        isNull(leads.deletedAt),
        eq(leads.status, "no_reply"),
      ),
    )
    .orderBy(desc(leads.updatedAt))
    .limit(25);
}
