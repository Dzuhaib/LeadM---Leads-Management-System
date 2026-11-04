"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activities, leads, users } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { findDuplicateLeads, normalizeProfileUrl } from "@/lib/duplicates";
import { getLeadById, getLeadTimeline } from "@/lib/leads";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { leadInputSchema, leadUpdateSchema, bulkStatusSchema } from "@/lib/validation";
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

    const duplicates = await findDuplicateLeads({
      profileUrl: data.profileUrl,
      businessName: data.businessName,
    });

    if (duplicates.length > 0 && !(user.role === "admin" && data.allowDuplicate)) {
      const match = duplicates[0];
      throw new ActionError(
        `Duplicate lead: ${match.businessName} is already owned by ${match.ownerName || match.ownerEmail}. Ask an admin to allow duplicates.`,
      );
    }

    const [created] = await db
      .insert(leads)
      .values({
        ownerId: user.id,
        contactName: data.contactName ?? "",
        businessName: data.businessName,
        jobTitle: data.jobTitle ?? null,
        industry: data.industry ?? null,
        country: data.country ?? null,
        channel: data.channel,
        source: data.source ?? null,
        profileUrl: normalizeProfileUrl(data.profileUrl),
        email: data.email ?? null,
        phone: data.phone ?? null,
        observation: data.observation ?? null,
        servicePitched: data.servicePitched,
        status: data.status ?? "new",
        notes: data.notes ?? null,
      })
      .returning({ id: leads.id });

    await recordAudit({
      userId: user.id,
      action: "lead_created",
      entity: "lead",
      entityId: created.id,
      details: { businessName: data.businessName },
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
        ...(data.servicePitched !== undefined
          ? { servicePitched: data.servicePitched }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, existing.id));

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
      .select({ id: leads.id, channel: leads.channel })
      .from(leads)
      .where(where);
    if (matched.length === 0) throw new ActionError("No matching leads found.");

    await db
      .update(leads)
      .set({ status: data.status, updatedAt: new Date() })
      .where(where);

    await db.insert(activities).values(
      matched.map((row) => ({
        leadId: row.id,
        userId: user.id,
        type: "status_change" as const,
        channel: row.channel,
        note: `Status changed to ${data.status.replaceAll("_", " ")}.`,
      })),
    );

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
