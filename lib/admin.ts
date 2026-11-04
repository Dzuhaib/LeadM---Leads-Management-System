import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { activities, leads, users, type Lead } from "@/db/schema";
import { zonedDayBounds } from "./date";
import { getSettings } from "./settings";
import type {
  AdminLeadListParams,
  AdminRepliesParams,
} from "./validation";
import {
  CHANNELS,
  type Channel,
  type LeadStatus,
  type ReplyTag,
} from "./constants";

const MESSAGE_TYPES_SQL = sql`('dm_sent', 'follow_up_3', 'follow_up_7', 'follow_up_14')`;

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "employee";
  status: "active" | "pending" | "deactivated";
  lastSeenAt: Date | null;
};

export type EmployeePerformanceRow = TeamMember & {
  messages: number;
  newLeads: number;
  replies: number;
  replyRate: number;
  calls: number;
  proposals: number;
  won: number;
  noReply: number;
  overdue: number;
  lastActive: Date | null;
  messagesToday: number;
  activeToday: boolean;
};

export type AdminLeadRow = Lead & {
  ownerName: string;
  ownerEmail: string;
};

export async function listTeamMembers(): Promise<TeamMember[]> {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      status: users.status,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .orderBy(asc(users.fullName), asc(users.email));
}

export async function listAssignableEmployeesForAdmin() {
  return db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(and(eq(users.role, "employee"), eq(users.status, "active")))
    .orderBy(asc(users.fullName), asc(users.email));
}

export async function listEmployeesWithCounts() {
  const rows = await db
    .select({
      ...getTableColumns(users),
      leadCount: count(leads.id),
    })
    .from(users)
    .leftJoin(
      leads,
      and(eq(leads.ownerId, users.id), isNull(leads.deletedAt)),
    )
    .groupBy(users.id)
    .orderBy(asc(users.fullName), asc(users.email));

  return rows.map((row) => ({ ...row, leadCount: Number(row.leadCount) }));
}

export async function getTeamMember(id: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

function enumerateDays(from: Date, to: Date, timeZone: string) {
  const start = parseISO(formatInTimeZone(from, timeZone, "yyyy-MM-dd"));
  const end = parseISO(formatInTimeZone(to, timeZone, "yyyy-MM-dd"));
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end && days.length < 366) {
    days.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function getAdminDashboard(input: {
  range: { from: Date; to: Date };
  timeZone: string;
  employeeId?: string;
}) {
  const { range, timeZone, employeeId } = input;
  const settingsRow = await getSettings();
  const members = await listTeamMembers();
  const scopedMembers = employeeId
    ? members.filter((member) => member.id === employeeId)
    : members;
  const scopedIds = scopedMembers.map((member) => member.id);
  const hasScope = scopedIds.length > 0;
  const now = new Date();
  const today = zonedDayBounds(now, timeZone);

  const activityFilters: SQL[] = [
    gte(activities.occurredAt, range.from),
    lte(activities.occurredAt, range.to),
    hasScope ? inArray(activities.userId, scopedIds) : sql`false`,
  ];
  const activityWhere = and(...activityFilters);

  const leadBaseFilters: SQL[] = [
    isNull(leads.deletedAt),
    hasScope ? inArray(leads.ownerId, scopedIds) : sql`false`,
  ];
  const leadBaseWhere = and(...leadBaseFilters);
  const leadRangeWhere = and(
    ...leadBaseFilters,
    gte(leads.createdAt, range.from),
    lte(leads.createdAt, range.to),
  );

  const todayFilters: SQL[] = [
    gte(activities.occurredAt, today.start),
    lte(activities.occurredAt, today.end),
    hasScope ? inArray(activities.userId, scopedIds) : sql`false`,
  ];

  const [
    activityPerfRows,
    newLeadRows,
    noReplyRows,
    overdueRows,
    todayMessagesRows,
    todayActivityRows,
    lastActivityRows,
    dailyRows,
    channelRows,
    industryRows,
    serviceRows,
    funnelRows,
  ] = await Promise.all([
    db
      .select({
        userId: activities.userId,
        messages: sql<number>`count(*) filter (where ${activities.type} in ${MESSAGE_TYPES_SQL})::int`,
        replies: sql<number>`count(*) filter (where ${activities.type} = 'reply_received')::int`,
        calls: sql<number>`count(*) filter (where ${activities.type} = 'call_booked')::int`,
        proposals: sql<number>`count(*) filter (where ${activities.type} = 'proposal_sent')::int`,
        won: sql<number>`count(*) filter (where ${activities.type} = 'won')::int`,
      })
      .from(activities)
      .where(activityWhere)
      .groupBy(activities.userId),
    db
      .select({ ownerId: leads.ownerId, value: count() })
      .from(leads)
      .where(leadRangeWhere)
      .groupBy(leads.ownerId),
    db
      .select({ ownerId: leads.ownerId, value: count() })
      .from(leads)
      .where(and(...leadBaseFilters, eq(leads.status, "no_reply")))
      .groupBy(leads.ownerId),
    db
      .select({ ownerId: leads.ownerId, value: count() })
      .from(leads)
      .where(
        and(
          ...leadBaseFilters,
          sql`${leads.nextFollowUpAt} is not null`,
          lt(leads.nextFollowUpAt, now),
          notInArray(leads.status, ["replied", "won", "lost"]),
        ),
      )
      .groupBy(leads.ownerId),
    db
      .select({ userId: activities.userId, value: count() })
      .from(activities)
      .where(
        and(
          ...todayFilters,
          sql`${activities.type} in ${MESSAGE_TYPES_SQL}`,
        ),
      )
      .groupBy(activities.userId),
    db
      .select({ userId: activities.userId, value: count() })
      .from(activities)
      .where(and(...todayFilters))
      .groupBy(activities.userId),
    db
      .select({
        userId: activities.userId,
        value: sql<Date | null>`max(${activities.occurredAt})`,
      })
      .from(activities)
      .where(
        hasScope ? inArray(activities.userId, scopedIds) : sql`false`,
      )
      .groupBy(activities.userId),
    db
      .select({
        userId: activities.userId,
        day: sql<string>`to_char(date_trunc('day', ${activities.occurredAt} at time zone ${timeZone}), 'YYYY-MM-DD')`,
        value: sql<number>`count(*)::int`,
      })
      .from(activities)
        .where(
          and(
            ...activityFilters,
            sql`${activities.type} in ${MESSAGE_TYPES_SQL}`,
          ),
        )
        .groupBy(sql`1`, sql`2`),
    db
      .select({
        channel: activities.channel,
        messages: sql<number>`count(*) filter (where ${activities.type} in ${MESSAGE_TYPES_SQL})::int`,
        replies: sql<number>`count(*) filter (where ${activities.type} = 'reply_received')::int`,
      })
      .from(activities)
      .where(activityWhere)
      .groupBy(activities.channel),
    db
      .select({
        key: leads.industry,
        replies: sql<number>`count(*)::int`,
      })
      .from(activities)
      .innerJoin(leads, eq(activities.leadId, leads.id))
      .where(
        and(
          ...activityFilters,
          eq(activities.type, "reply_received"),
          isNull(leads.deletedAt),
          sql`${leads.industry} is not null and ${leads.industry} <> ''`,
        ),
      )
      .groupBy(leads.industry)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({
        key: leads.servicePitched,
        replies: sql<number>`count(*)::int`,
      })
      .from(activities)
      .innerJoin(leads, eq(activities.leadId, leads.id))
      .where(
        and(
          ...activityFilters,
          eq(activities.type, "reply_received"),
          isNull(leads.deletedAt),
        ),
      )
      .groupBy(leads.servicePitched)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({ status: leads.status, value: count() })
      .from(leads)
      .where(leadBaseWhere)
      .groupBy(leads.status),
  ]);

  const newLeadsMap = new Map(
    newLeadRows.map((row) => [row.ownerId, toNumber(row.value)]),
  );
  const noReplyMap = new Map(
    noReplyRows.map((row) => [row.ownerId, toNumber(row.value)]),
  );
  const overdueMap = new Map(
    overdueRows.map((row) => [row.ownerId, toNumber(row.value)]),
  );
  const todayMessagesMap = new Map(
    todayMessagesRows.map((row) => [row.userId, toNumber(row.value)]),
  );
  const todayActivityMap = new Map(
    todayActivityRows.map((row) => [row.userId, toNumber(row.value)]),
  );
  const lastActivityMap = new Map(
    lastActivityRows.map((row) => [
      row.userId,
      row.value ? new Date(row.value) : null,
    ]),
  );
  const perfMap = new Map(activityPerfRows.map((row) => [row.userId, row]));

  let totals = {
    messages: 0,
    newLeads: 0,
    replies: 0,
    replyRate: 0,
    calls: 0,
    proposals: 0,
    won: 0,
  };

  for (const row of activityPerfRows) {
    totals.messages += toNumber(row.messages);
    totals.replies += toNumber(row.replies);
    totals.calls += toNumber(row.calls);
    totals.proposals += toNumber(row.proposals);
    totals.won += toNumber(row.won);
  }
  for (const row of newLeadRows) {
    totals.newLeads += toNumber(row.value);
  }
  totals = {
    ...totals,
    replyRate:
      totals.messages > 0
        ? Math.round((totals.replies / totals.messages) * 100)
        : 0,
  };

  const performance: EmployeePerformanceRow[] = scopedMembers.map((member) => {
    const perf = perfMap.get(member.id);
    const messages = toNumber(perf?.messages);
    const replies = toNumber(perf?.replies);
    const activityLast = lastActivityMap.get(member.id) ?? null;
    const candidates = [member.lastSeenAt, activityLast].filter(
      (value): value is Date => Boolean(value),
    );
    const lastActive =
      candidates.length > 0
        ? new Date(Math.max(...candidates.map((value) => value.getTime())))
        : null;
    const messagesToday = todayMessagesMap.get(member.id) ?? 0;

    return {
      ...member,
      messages,
      newLeads: newLeadsMap.get(member.id) ?? 0,
      replies,
      replyRate: messages > 0 ? Math.round((replies / messages) * 100) : 0,
      calls: toNumber(perf?.calls),
      proposals: toNumber(perf?.proposals),
      won: toNumber(perf?.won),
      noReply: noReplyMap.get(member.id) ?? 0,
      overdue: overdueMap.get(member.id) ?? 0,
      lastActive,
      messagesToday,
      activeToday: (todayActivityMap.get(member.id) ?? 0) > 0,
    };
  });

  performance.sort(
    (a, b) =>
      b.messages - a.messages ||
      b.replies - a.replies ||
      b.won - a.won ||
      a.fullName.localeCompare(b.fullName),
  );

  const dayKeys = enumerateDays(range.from, range.to, timeZone);
  const dayMap = new Map<string, Record<string, number | string>>();
  for (const day of dayKeys) {
    dayMap.set(day, { day });
  }
  for (const row of dailyRows) {
    const day = dayMap.get(row.day);
    if (!day) continue;
    const current = Number(day[row.userId] ?? 0);
    day[row.userId] = current + toNumber(row.value);
  }
  const dailyByEmployee = Array.from(dayMap.values());

  const channelMap = new Map(
    channelRows.map((row) => [
      row.channel,
      { messages: toNumber(row.messages), replies: toNumber(row.replies) },
    ]),
  );
  const channels = CHANNELS.map((channel) => {
    const row = channelMap.get(channel);
    const messages = row?.messages ?? 0;
    const replies = row?.replies ?? 0;
    return {
      channel: channel as Channel,
      messages,
      replies,
      replyRate:
        messages > 0 ? Math.round((replies / messages) * 100) : 0,
    };
  });

  const funnelMap = new Map(
    funnelRows.map((row) => [row.status, toNumber(row.value)]),
  );

  const leaderboard = performance.slice(0, 5);

  return {
    allMembers: members,
    members: scopedMembers,
    days: dayKeys,
    dailyByEmployee,
    totals,
    performance,
    leaderboard,
    channels,
    industries: industryRows
      .filter((row) => Boolean(row.key))
      .map((row) => ({ name: row.key as string, replies: toNumber(row.replies) })),
    services: serviceRows.map((row) => ({
      name: row.key,
      replies: toNumber(row.replies),
    })),
    funnel: (
      [
        "new",
        "contacted",
        "replied",
        "call_booked",
        "proposal_sent",
        "won",
      ] as const
    ).map((status) => ({ status: status as LeadStatus, value: funnelMap.get(status) ?? 0 })),
    settings: settingsRow,
  };
}

export async function listAdminLeads(
  params: AdminLeadListParams,
  timeZone: string,
) {
  void timeZone;
  const filters: SQL[] = [isNull(leads.deletedAt)];
  if (params.owner) filters.push(eq(leads.ownerId, params.owner));
  if (params.status) filters.push(eq(leads.status, params.status));
  if (params.channel) filters.push(eq(leads.channel, params.channel));
  if (params.q) {
    const query = `%${params.q}%`;
    filters.push(
      or(
        ilike(leads.businessName, query),
        ilike(leads.contactName, query),
        ilike(leads.industry, query),
        ilike(leads.country, query),
        ilike(users.fullName, query),
        ilike(users.email, query),
      )!,
    );
  }

  const where = and(...filters);
  const sortColumn =
    params.sort === "business_name"
      ? leads.businessName
      : params.sort === "status"
        ? leads.status
        : params.sort === "next_follow_up_at"
          ? leads.nextFollowUpAt
          : params.sort === "owner"
            ? users.fullName
            : leads.createdAt;
  const order = params.dir === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (params.page - 1) * params.pageSize;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        ...getTableColumns(leads),
        ownerName: users.fullName,
        ownerEmail: users.email,
      })
      .from(leads)
      .innerJoin(users, eq(leads.ownerId, users.id))
      .where(where)
      .orderBy(order)
      .limit(params.pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(leads)
      .innerJoin(users, eq(leads.ownerId, users.id))
      .where(where),
  ]);

  const total = toNumber(totalRows[0]?.value);
  return {
    rows: rows as AdminLeadRow[],
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

function parseFilterDate(value: string | undefined, timeZone: string, end = false) {
  if (!value) return null;
  const parsed = fromZonedTime(
    `${value}T${end ? "23:59:59.999" : "00:00:00"}`,
    timeZone,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type AdminReplyRow = {
  id: string;
  replyText: string | null;
  replyTag: ReplyTag | null;
  occurredAt: Date;
  channel: Channel;
  leadId: string;
  businessName: string;
  contactName: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
};

export async function listAdminReplies(
  params: AdminRepliesParams,
  timeZone: string,
) {
  const filters: SQL[] = [
    eq(activities.type, "reply_received"),
    isNull(leads.deletedAt),
  ];
  if (params.employee) filters.push(eq(activities.userId, params.employee));
  if (params.channel) filters.push(eq(activities.channel, params.channel));
  if (params.tag) filters.push(eq(activities.replyTag, params.tag));

  const from = parseFilterDate(params.from, timeZone);
  const to = parseFilterDate(params.to, timeZone, true);
  if (from) filters.push(gte(activities.occurredAt, from));
  if (to) filters.push(lte(activities.occurredAt, to));

  const rows = await db
    .select({
      id: activities.id,
      replyText: activities.replyText,
      replyTag: activities.replyTag,
      occurredAt: activities.occurredAt,
      channel: activities.channel,
      leadId: leads.id,
      businessName: leads.businessName,
      contactName: leads.contactName,
      employeeId: users.id,
      employeeName: users.fullName,
      employeeEmail: users.email,
    })
    .from(activities)
    .innerJoin(leads, eq(activities.leadId, leads.id))
    .innerJoin(users, eq(activities.userId, users.id))
    .where(and(...filters))
    .orderBy(desc(activities.occurredAt))
    .limit(200);

  return rows as AdminReplyRow[];
}

export type AdminNoReplyRow = {
  id: string;
  businessName: string;
  contactName: string;
  channel: Channel;
  followUpStage: number;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  lastMessageAt: Date | null;
  daysSinceContact: number;
};

export async function listAdminNoReplies(
  params: AdminRepliesParams,
  timeZone: string,
) {
  void timeZone;
  const lastMessage = sql`(
    select max(a.occurred_at)
    from activities a
    where a.lead_id = ${leads.id}
      and a.type in ('dm_sent', 'follow_up_3', 'follow_up_7', 'follow_up_14')
  )`;

  const filters: SQL[] = [
    eq(leads.status, "no_reply"),
    isNull(leads.deletedAt),
    sql`${lastMessage} is not null`,
  ];
  if (params.employee) filters.push(eq(leads.ownerId, params.employee));
  if (params.channel) filters.push(eq(leads.channel, params.channel));

  const order =
    params.sort === "newest"
      ? desc(sql`${lastMessage}`)
      : params.sort === "stage"
        ? asc(leads.followUpStage)
        : asc(sql`${lastMessage}`);

  const rows = await db
    .select({
      id: leads.id,
      businessName: leads.businessName,
      contactName: leads.contactName,
      channel: leads.channel,
      followUpStage: leads.followUpStage,
      ownerId: users.id,
      ownerName: users.fullName,
      ownerEmail: users.email,
      lastMessageAt: sql<Date | null>`${lastMessage}`,
      daysSinceContact: sql<number>`greatest(0, floor(extract(epoch from (now() - ${lastMessage})) / 86400))::int`,
    })
    .from(leads)
    .innerJoin(users, eq(leads.ownerId, users.id))
    .where(and(...filters))
    .orderBy(order)
    .limit(200);

  return rows.map((row) => ({
    ...row,
    lastMessageAt: row.lastMessageAt
      ? new Date(row.lastMessageAt as Date | string)
      : null,
    daysSinceContact: Number(row.daysSinceContact),
  })) as AdminNoReplyRow[];
}

export async function listEmployeeActivities(ownerId: string, limit = 50) {
  return db
    .select({
      id: activities.id,
      type: activities.type,
      channel: activities.channel,
      replyText: activities.replyText,
      replyTag: activities.replyTag,
      note: activities.note,
      occurredAt: activities.occurredAt,
      businessName: leads.businessName,
      leadId: leads.id,
    })
    .from(activities)
    .innerJoin(leads, eq(activities.leadId, leads.id))
    .where(eq(activities.userId, ownerId))
    .orderBy(desc(activities.occurredAt))
    .limit(limit);
}
