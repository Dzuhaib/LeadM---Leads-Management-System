"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activities, leads, users } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { findDuplicateLeads, normalizeProfileUrl } from "@/lib/duplicates";
import { deriveLeadName, getLeadById, getLeadTimeline } from "@/lib/leads";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { leadInputSchema, leadUpdateSchema, bulkStatusSchema } from "@/lib/validation";
import { notifyReplyReceived } from "@/lib/email-notify";
import { firstMessageTransition } from "@/lib/follow-up";
import { getSettings } from "@/lib/settings";
import { z } from "zod";

async function requireActionUser() {
  const user = await getCurrentDbUser();
  if (!user) throw new ActionError("You must be signed in.");
  if (user.status !== "active") throw new ActionError("Your account is not active.");
  return user;
}

function enforceRateLimit(userId: string, action: string) {
  const result = checkRateLimit(rateLimitKey(userId, action), 40, 60_000);
  if (!result.ok) {
    throw new ActionError("Too many changes. Please wait a moment and try again.");
  }
}

function revalidateLeads() {
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/templates");
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/replies");
  revalidatePath("/admin/employees");
}

export async function createLead(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "lead:create");

    const data = leadInputSchema.parse(input);
    const businessName =
      data.businessName?.trim() ||
      deriveLeadName({
        sourceUrl: data.profileUrl,
        email: data.email,
        phone: data.phone,
        serviceWanted: data.serviceWanted,
        channel: data.channel,
      });

    const duplicates = await findDuplicateLeads({
      profileUrl: data.profileUrl,
      businessName,
    });

    if (duplicates.length > 0 && !(user.role === "admin" && data.allowDuplicate)) {
      const match = duplicates[0];
      throw new ActionError(
        `Duplicate lead: ${match.businessName} is already owned by ${match.ownerName || match.ownerEmail}. Ask an admin to allow duplicates.`,
      );
    }

    const settingsRow = await getSettings();
    const contactedOnCreate = (data.status ?? "new") === "contacted";
    const now = new Date();
    const createTransition = firstMessageTransition(now, settingsRow.followUpDays);

    const [created] = await db
      .insert(leads)
      .values({
        ownerId: user.id,
        contactName: data.contactName ?? "",
        businessName,
        jobTitle: data.jobTitle ?? null,
        industry: data.industry ?? null,
        country: data.country ?? null,
        channel: data.channel,
        source: data.source ?? null,
        profileUrl: normalizeProfileUrl(data.profileUrl),
        email: data.email ?? null,
        phone: data.phone ?? null,
        observation: data.observation ?? null,
        serviceWanted: data.serviceWanted || null,
        servicePitched: data.servicePitched,
        status: data.status ?? "new",
        notes: data.notes ?? null,
        ...(contactedOnCreate
          ? {
              followUpStage: createTransition.followUpStage,
              nextFollowUpAt: createTransition.nextFollowUpAt,
            }
          : {}),
      })
      .returning({ id: leads.id });

    if (contactedOnCreate) {
      await db.insert(activities).values({
        leadId: created.id,
        userId: user.id,
        type: "dm_sent",
        channel: data.channel,
        occurredAt: now,
      });
    }

    await recordAudit({
      userId: user.id,
      action: "lead_created",
      entity: "lead",
      entityId: created.id,
      details: { businessName },
    });

    revalidateLeads();
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return toActionError(error) as ActionResult<{ id: string }>;
  }
}

export async function updateLead(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "lead:update");

    const data = leadUpdateSchema.parse(input);
    const existing = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, data.id), isNull(leads.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) throw new ActionError("Lead not found.");
    if (user.role !== "admin" && existing.ownerId !== user.id) {
      throw new ActionError("You do not have access to this lead.");
    }

    if (data.profileUrl !== undefined || data.businessName !== undefined) {
      const duplicates = await findDuplicateLeads({
        profileUrl: data.profileUrl ?? existing.profileUrl,
        businessName: data.businessName ?? existing.businessName,
        excludeLeadId: existing.id,
      });
      if (duplicates.length > 0 && !(user.role === "admin" && data.allowDuplicate)) {
        throw new ActionError(
          `Another lead for ${duplicates[0].businessName} already exists (owner: ${duplicates[0].ownerName || duplicates[0].ownerEmail}).`,
        );
      }
    }

    const statusChangedToContacted =
      data.status !== undefined && data.status === "contacted" && existing.status !== "contacted";
    const scheduleFollowUp =
      statusChangedToContacted && existing.nextFollowUpAt === null;
    const transition = scheduleFollowUp
      ? firstMessageTransition(new Date(), (await getSettings()).followUpDays)
      : null;

    await db
      .update(leads)
      .set({
        ...(data.contactName !== undefined ? { contactName: data.contactName } : {}),
        ...(data.businessName !== undefined ? { businessName: data.businessName } : {}),
        ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle } : {}),
        ...(data.industry !== undefined ? { industry: data.industry } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.channel !== undefined ? { channel: data.channel } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.profileUrl !== undefined
          ? { profileUrl: normalizeProfileUrl(data.profileUrl) }
          : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.observation !== undefined ? { observation: data.observation } : {}),
        ...(data.serviceWanted !== undefined
          ? { serviceWanted: data.serviceWanted }
          : {}),
        ...(data.servicePitched !== undefined
          ? { servicePitched: data.servicePitched }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(transition
          ? {
              followUpStage: transition.followUpStage,
              nextFollowUpAt: transition.nextFollowUpAt,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, existing.id));

    if (statusChangedToContacted) {
      await db.insert(activities).values({
        leadId: existing.id,
        userId: user.id,
        type: "dm_sent",
        channel: existing.channel,
        occurredAt: new Date(),
      });
    }

    if (user.role === "admin") {
      await recordAudit({
        userId: user.id,
        action: "lead_updated_admin",
        entity: "lead",
        entityId: existing.id,
        details: {
          businessName: data.businessName ?? existing.businessName,
          ownerId: existing.ownerId,
        },
      });
    }

    if (data.status === "replied" && existing.status !== "replied") {
      await notifyReplyReceived({
        lead: { ...existing, status: "replied" },
        actor: { email: user.email, fullName: user.fullName, role: user.role },
        replyTag: null,
        replyText: null,
        occurredAt: new Date(),
      });
    }

    revalidateLeads();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "lead:delete");
    const id = z.string().uuid().parse(leadId);

    const existing = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existing) throw new ActionError("Lead not found.");
    if (user.role !== "admin" && existing.ownerId !== user.id) {
      throw new ActionError("You do not have access to this lead.");
    }

    await db
      .update(leads)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(leads.id, id));

    await recordAudit({
      userId: user.id,
      action: "lead_deleted",
      entity: "lead",
      entityId: id,
      details: { businessName: existing.businessName },
    });

    revalidateLeads();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function bulkUpdateLeadStatus(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireActionUser();
    enforceRateLimit(user.id, "lead:bulk");
    const data = bulkStatusSchema.parse(input);

    const where =
      user.role === "admin"
        ? and(inArray(leads.id, data.leadIds), isNull(leads.deletedAt))
        : and(
            inArray(leads.id, data.leadIds),
            eq(leads.ownerId, user.id),
            isNull(leads.deletedAt),
          );

    const matched = await db
      .select()
      .from(leads)
      .where(where);
    if (matched.length === 0) throw new ActionError("No matching leads found.");

    const now = new Date();
    const remainingContactable =
      data.status === "contacted"
        ? matched.filter(
            (row) => row.status !== "contacted" && row.nextFollowUpAt === null,
          )
        : [];
    const scheduleTransition =
      remainingContactable.length > 0
        ? firstMessageTransition(now, (await getSettings()).followUpDays)
        : null;

    await db
      .update(leads)
      .set({ status: data.status, updatedAt: now })
      .where(where);

    if (scheduleTransition) {
      for (const row of remainingContactable) {
        await db
          .update(leads)
          .set({
            followUpStage: scheduleTransition.followUpStage,
            nextFollowUpAt: scheduleTransition.nextFollowUpAt,
            updatedAt: now,
          })
          .where(eq(leads.id, row.id));
      }
    }

    await db.insert(activities).values([
      ...matched.map((row) => ({
        leadId: row.id,
        userId: user.id,
        type: "status_change" as const,
        channel: row.channel,
        note: `Status changed to ${data.status.replaceAll("_", " ")}.`,
      })),
      ...(data.status === "contacted"
        ? matched
            .filter((row) => row.status !== "contacted")
            .map((row) => ({
              leadId: row.id,
              userId: user.id,
              type: "dm_sent" as const,
              channel: row.channel,
              occurredAt: now,
            }))
        : []),
    ]);

    if (data.status === "replied") {
      for (const row of matched) {
        if (row.status === "replied") continue;
        await notifyReplyReceived({
          lead: { ...row, status: "replied" },
          actor: { email: user.email, fullName: user.fullName, role: user.role },
          replyTag: null,
          replyText: null,
          occurredAt: new Date(),
        });
      }
    }

    await recordAudit({
      userId: user.id,
      action: "leads_bulk_status_changed",
      entity: "lead",
      details: {
        leadIds: matched.map((row) => row.id),
        status: data.status,
      },
    });

    revalidateLeads();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getLeadDetail(leadId: string): Promise<
  ActionResult<{
    lead: NonNullable<Awaited<ReturnType<typeof getLeadById>>>;
    timeline: Awaited<ReturnType<typeof getLeadTimeline>>;
  }>
> {
  try {
    const user = await requireActionUser();
    const id = z.string().uuid().parse(leadId);
    const lead = await getLeadById(id);
    if (!lead) throw new ActionError("Lead not found.");
    if (user.role !== "admin" && lead.ownerId !== user.id) {
      throw new ActionError("You do not have access to this lead.");
    }
    const timeline = await getLeadTimeline(id);
    return { ok: true, data: { lead, timeline } };
  } catch (error) {
    return toActionError(error) as ActionResult<{
      lead: NonNullable<Awaited<ReturnType<typeof getLeadById>>>;
      timeline: Awaited<ReturnType<typeof getLeadTimeline>>;
    }>;
  }
}

export async function listAssignableEmployees() {
  const user = await requireActionUser();
  if (user.role !== "admin") throw new ActionError("Admin only.");
  return db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.role, "employee"));
}
