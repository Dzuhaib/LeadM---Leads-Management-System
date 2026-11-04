"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { db } from "@/db";
import { activities, leads, users } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import {
  advanceFollowUpTransition,
  firstMessageTransition,
  followUpActivityType,
} from "@/lib/follow-up";
import { getAppTimeZone } from "@/lib/date";
import { getLeadById } from "@/lib/leads";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { notifyReplyReceived } from "@/lib/email-notify";
import { logFollowUpSchema, logReplySchema } from "@/lib/validation";

async function requireActionUser() {
  const user = await getCurrentDbUser();
  if (!user) throw new ActionError("You must be signed in.");
  if (user.status !== "active") throw new ActionError("Your account is not active.");
  return user;
}

function enforceRateLimit(userId: string, action: string) {
  const result = checkRateLimit(rateLimitKey(userId, action), 60, 60_000);
  if (!result.ok) {
    throw new ActionError("Too many actions. Please wait a moment and try again.");
  }
}

function parseOccurredAt(value: string | undefined, timeZone: string) {
  if (!value) return new Date();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const parsed = hasZone ? new Date(value) : fromZonedTime(value, timeZone);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function loadOwnedLead(userId: string, role: string, leadId: string) {
  const lead = await getLeadById(leadId);
  if (!lead) throw new ActionError("Lead not found.");
  if (role !== "admin" && lead.ownerId !== userId) {
    throw new ActionError("You do not have access to this lead.");
  }
  return lead;
}

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/templates");
}

async function touchUser(userId: string) {
  await db
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(eq(users.id, userId));
}

const leadEventSchema = z.object({
  leadId: z.string().uuid(),
  occurredAt: z.string().optional(),
});

export async function logFirstMessage(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "activity:first-message");
    const data = leadEventSchema.parse(input);
    const lead = await loadOwnedLead(user.id, user.role, data.leadId);

    const firstMessages = await db
      .select({ value: count() })
      .from(activities)
      .where(
        and(eq(activities.leadId, lead.id), eq(activities.type, "dm_sent")),
      );
    if (Number(firstMessages[0]?.value ?? 0) > 0) {
      throw new ActionError(
        "The first message has already been logged for this lead. Use log follow-up instead.",
      );
    }

    const settingsRow = await getSettings();
    const occurredAt = parseOccurredAt(
      data.occurredAt,
      settingsRow.timezone || getAppTimeZone(),
    );
    const transition = firstMessageTransition(occurredAt, settingsRow.followUpDays);

    await db.insert(activities).values({
      leadId: lead.id,
      userId: user.id,
      type: "dm_sent",
      channel: lead.channel,
      occurredAt,
    });

    await db
      .update(leads)
      .set({
        status: transition.status,
        followUpStage: transition.followUpStage,
        nextFollowUpAt: transition.nextFollowUpAt,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    await touchUser(user.id);
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function logFollowUp(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "activity:follow-up");
    const data = logFollowUpSchema.parse(input);
    const lead = await loadOwnedLead(user.id, user.role, data.leadId);

    if (["replied", "won", "lost"].includes(lead.status)) {
      throw new ActionError("The follow-up sequence is already closed for this lead.");
    }

    const firstMessages = await db
      .select({ value: count() })
      .from(activities)
      .where(
        and(eq(activities.leadId, lead.id), eq(activities.type, "dm_sent")),
      );
    if (Number(firstMessages[0]?.value ?? 0) === 0) {
      throw new ActionError("Log the first message before logging a follow-up.");
    }

    const type = followUpActivityType(lead.followUpStage);
    if (!type) {
      throw new ActionError("All follow-ups for this lead have already been sent.");
    }

    const settingsRow = await getSettings();
    const occurredAt = parseOccurredAt(
      data.occurredAt,
      settingsRow.timezone || getAppTimeZone(),
    );
    const transition = advanceFollowUpTransition(
      lead.followUpStage,
      occurredAt,
      settingsRow.followUpDays,
    );

    await db.insert(activities).values({
      leadId: lead.id,
      userId: user.id,
      type,
      channel: lead.channel,
      occurredAt,
    });

    await db
      .update(leads)
      .set({
        status: transition.status,
        followUpStage: transition.followUpStage,
        nextFollowUpAt: transition.nextFollowUpAt,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    await touchUser(user.id);
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function logReply(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "activity:reply");
    const data = logReplySchema.parse(input);
    const lead = await loadOwnedLead(user.id, user.role, data.leadId);
    const settingsRow = await getSettings();
    const occurredAt = parseOccurredAt(
      data.occurredAt,
      settingsRow.timezone || getAppTimeZone(),
    );

    await db.insert(activities).values({
      leadId: lead.id,
      userId: user.id,
      type: "reply_received",
      channel: lead.channel,
      replyText: data.replyText,
      replyTag: data.replyTag,
      occurredAt,
    });

    await db
      .update(leads)
      .set({
        status: "replied",
        nextFollowUpAt: null,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    await touchUser(user.id);
    revalidateAll();
    await notifyReplyReceived({
      lead,
      actor: { email: user.email, fullName: user.fullName, role: user.role },
      replyTag: data.replyTag ?? null,
      replyText: data.replyText ?? null,
      occurredAt,
    });
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

const milestoneSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["call_booked", "proposal_sent", "won", "lost", "note"]),
  occurredAt: z.string().optional(),
  note: z.string().trim().max(4000).optional(),
});

const statusByType = {
  call_booked: "call_booked",
  proposal_sent: "proposal_sent",
  won: "won",
  lost: "lost",
  note: undefined,
} as const;

export async function logMilestone(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "activity:milestone");
    const data = milestoneSchema.parse(input);
    const lead = await loadOwnedLead(user.id, user.role, data.leadId);
    const settingsRow = await getSettings();
    const occurredAt = parseOccurredAt(
      data.occurredAt,
      settingsRow.timezone || getAppTimeZone(),
    );
    const nextStatus = statusByType[data.type];

    await db.insert(activities).values({
      leadId: lead.id,
      userId: user.id,
      type: data.type,
      channel: lead.channel,
      note: data.note ?? null,
      occurredAt,
    });

    await db
      .update(leads)
      .set({
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(data.type === "won" || data.type === "lost"
          ? { nextFollowUpAt: null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    await touchUser(user.id);
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

const noteSchema = z.object({
  leadId: z.string().uuid(),
  note: z.string().trim().min(1, "Note is required").max(4000),
  occurredAt: z.string().optional(),
});

export async function logNote(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "activity:note");
    const data = noteSchema.parse(input);
    const lead = await loadOwnedLead(user.id, user.role, data.leadId);
    const settingsRow = await getSettings();
    const occurredAt = parseOccurredAt(
      data.occurredAt,
      settingsRow.timezone || getAppTimeZone(),
    );

    await db.insert(activities).values({
      leadId: lead.id,
      userId: user.id,
      type: "note",
      channel: lead.channel,
      note: data.note,
      occurredAt,
    });

    await touchUser(user.id);
    revalidateAll();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
