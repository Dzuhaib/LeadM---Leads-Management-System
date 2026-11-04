import { and, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, leads } from "@/db/schema";
import { zonedDayBounds } from "./date";
import { getSettings } from "./settings";
import { getFollowUpsDue, getNoReplyLeads } from "./leads";

export type DashboardRange = { from: Date; to: Date };

const MESSAGE_TYPES_SQL = sql`('dm_sent', 'follow_up_3', 'follow_up_7', 'follow_up_14')`;

export async function getEmployeeDashboard(
  ownerId: string,
  range: DashboardRange,
  timeZone: string,
) {
  const settingsRow = await getSettings();
  const today = zonedDayBounds(new Date(), timeZone);

  const activityRange = and(
    eq(activities.userId, ownerId),
    gte(activities.occurredAt, range.from),
    lte(activities.occurredAt, range.to),
  );

  const leadRange = and(
    eq(leads.ownerId, ownerId),
    isNull(leads.deletedAt),
    gte(leads.createdAt, range.from),
    lte(leads.createdAt, range.to),
  );

  const [totalsRows, newLeadRows, dailyMessages, dailyReplies, channelRows] =
    await Promise.all([
      db
        .select({
          messages: sql<number>`count(*) filter (where ${activities.type} in ${MESSAGE_TYPES_SQL})::int`,
          replies: sql<number>`count(*) filter (where ${activities.type} = 'reply_received')::int`,
          calls: sql<number>`count(*) filter (where ${activities.type} = 'call_booked')::int`,
          proposals: sql<number>`count(*) filter (where ${activities.type} = 'proposal_sent')::int`,
          won: sql<number>`count(*) filter (where ${activities.type} = 'won')::int`,
        })
        .from(activities)
        .where(activityRange),
      db
        .select({ value: count() })
        .from(leads)
        .where(leadRange),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${activities.occurredAt} at time zone ${timeZone}), 'YYYY-MM-DD')`,
          value: sql<number>`count(*)::int`,
        })
        .from(activities)
        .where(
          and(
            activityRange,
            sql`${activities.type} in ${MESSAGE_TYPES_SQL}`,
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${activities.occurredAt} at time zone ${timeZone}), 'YYYY-MM-DD')`,
          value: sql<number>`count(*)::int`,
        })
        .from(activities)
        .where(
          and(activityRange, eq(activities.type, "reply_received")),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`),
      db
        .select({
          channel: activities.channel,
          messages: sql<number>`count(*) filter (where ${activities.type} in ${MESSAGE_TYPES_SQL})::int`,
          replies: sql<number>`count(*) filter (where ${activities.type} = 'reply_received')::int`,
        })
        .from(activities)
        .where(activityRange)
        .groupBy(activities.channel),
    ]);

  const [funnelRows, todayMessagesRows, todayLeadsRows, recent] =
    await Promise.all([
      db
        .select({ status: leads.status, value: count() })
        .from(leads)
        .where(and(eq(leads.ownerId, ownerId), isNull(leads.deletedAt)))
        .groupBy(leads.status),
      db
        .select({ value: count() })
        .from(activities)
        .where(
          and(
            eq(activities.userId, ownerId),
            gte(activities.occurredAt, today.start),
            lte(activities.occurredAt, today.end),
            sql`${activities.type} in ${MESSAGE_TYPES_SQL}`,
          ),
        ),
      db
        .select({ value: count() })
        .from(leads)
        .where(
          and(
            eq(leads.ownerId, ownerId),
            isNull(leads.deletedAt),
            gte(leads.createdAt, today.start),
            lte(leads.createdAt, today.end),
          ),
        ),
      db
        .select({
          id: activities.id,
          type: activities.type,
          channel: activities.channel,
          occurredAt: activities.occurredAt,
          replyText: activities.replyText,
          replyTag: activities.replyTag,
          businessName: leads.businessName,
          contactName: leads.contactName,
          leadId: leads.id,
        })
        .from(activities)
        .innerJoin(leads, eq(activities.leadId, leads.id))
        .where(eq(activities.userId, ownerId))
        .orderBy(desc(activities.occurredAt))
        .limit(8),
    ]);

  const [followUps, noReply] = await Promise.all([
    getFollowUpsDue(ownerId, timeZone),
    getNoReplyLeads(ownerId),
  ]);

  const totals = totalsRows[0] ?? {
    messages: 0,
    replies: 0,
    calls: 0,
    proposals: 0,
    won: 0,
  };
  const newLeads = Number(newLeadRows[0]?.value ?? 0);
  const messages = Number(totals.messages ?? 0);
  const replies = Number(totals.replies ?? 0);

  const funnelMap = new Map(
    funnelRows.map((row) => [row.status, Number(row.value)]),
  );

  return {
    totals: {
      messages,
      newLeads,
      replies,
      replyRate: messages > 0 ? Math.round((replies / messages) * 100) : 0,
      calls: Number(totals.calls ?? 0),
      proposals: Number(totals.proposals ?? 0),
      won: Number(totals.won ?? 0),
    },
    dailyMessages,
    dailyReplies,
    channels: channelRows.map((row) => {
      const messagesCount = Number(row.messages ?? 0);
      const repliesCount = Number(row.replies ?? 0);
      return {
        channel: row.channel,
        messages: messagesCount,
        replies: repliesCount,
        replyRate:
          messagesCount > 0
            ? Math.round((repliesCount / messagesCount) * 100)
            : 0,
      };
    }),
    funnel: (
      [
        "new",
        "contacted",
        "replied",
        "call_booked",
        "proposal_sent",
        "won",
      ] as const
    ).map((status) => ({ status, value: funnelMap.get(status) ?? 0 })),
    followUps,
    noReply,
    recent,
    targets: {
      messages: {
        current: Number(todayMessagesRows[0]?.value ?? 0),
        target: settingsRow.dailyMessagesTarget,
      },
      leads: {
        current: Number(todayLeadsRows[0]?.value ?? 0),
        target: settingsRow.dailyNewLeadsTarget,
      },
    },
    settings: settingsRow,
  };
}
