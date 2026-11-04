"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activities, leads, users } from "@/db/schema";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { getCurrentDbUser } from "@/lib/auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import {
  employeeStatusSchema,
  reassignLeadsSchema,
  sendBackSchema,
} from "@/lib/validation";

async function requireAdminAction() {
  const user = await getCurrentDbUser();
  if (!user) throw new ActionError("You must be signed in.");
  if (user.status !== "active") throw new ActionError("Your account is not active.");
  if (user.role !== "admin") throw new ActionError("Admin access required.");
  return user;
}

function enforceRateLimit(userId: string, action: string) {
  const result = checkRateLimit(rateLimitKey(userId, action), 60, 60_000);
  if (!result.ok) {
    throw new ActionError("Too many changes. Please wait a moment and try again.");
  }
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/replies");
  revalidatePath("/admin/employees");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
}

export async function updateEmployeeStatus(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    enforceRateLimit(admin.id, "admin:employee-status");
    const data = employeeStatusSchema.parse(input);

    const target = await db
      .select()
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!target) throw new ActionError("Employee not found.");
    if (target.role === "admin" || target.id === admin.id) {
      throw new ActionError("The admin account cannot be deactivated here.");
    }
    if (target.status === data.status) {
      return { ok: true };
    }

    await db
      .update(users)
      .set({ status: data.status })
      .where(eq(users.id, target.id));

    await recordAudit({
      userId: admin.id,
      action: "user_status_changed",
      entity: "user",
      entityId: target.id,
      details: {
        email: target.email,
        from: target.status,
        to: data.status,
      },
    });

    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reassignLeads(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    enforceRateLimit(admin.id, "admin:reassign");
    const data = reassignLeadsSchema.parse(input);

    const target = await db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.id, data.ownerId),
          eq(users.role, "employee"),
          eq(users.status, "active"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!target) {
      throw new ActionError("Choose an active employee as the new owner.");
    }

    const matched = await db
      .select({
        id: leads.id,
        channel: leads.channel,
        ownerId: leads.ownerId,
        businessName: leads.businessName,
      })
      .from(leads)
      .where(and(inArray(leads.id, data.leadIds), isNull(leads.deletedAt)));

    if (matched.length === 0) throw new ActionError("No matching leads found.");

    await db
      .update(leads)
      .set({ ownerId: target.id, updatedAt: new Date() })
      .where(
        and(
          inArray(
            leads.id,
            matched.map((row) => row.id),
          ),
          isNull(leads.deletedAt),
        ),
      );

    await db.insert(activities).values(
      matched.map((row) => ({
        leadId: row.id,
        userId: admin.id,
        type: "note" as const,
        channel: row.channel,
        note: `Lead reassigned to ${target.fullName || target.email} by admin.`,
      })),
    );

    await recordAudit({
      userId: admin.id,
      action: "leads_reassigned",
      entity: "lead",
      details: {
        leadIds: matched.map((row) => row.id),
        to: target.id,
        toEmail: target.email,
        from: matched.map((row) => ({
          leadId: row.id,
          ownerId: row.ownerId,
        })),
      },
    });

    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function sendBackForFollowUp(
  input: unknown,
): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    enforceRateLimit(admin.id, "admin:send-back");
    const { leadId } = sendBackSchema.parse(input);

    const lead = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), isNull(leads.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!lead) throw new ActionError("Lead not found.");

    await db
      .update(leads)
      .set({
        status: "contacted",
        followUpStage: 0,
        nextFollowUpAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    await db.insert(activities).values({
      leadId: lead.id,
      userId: admin.id,
      type: "note",
      channel: lead.channel,
      note: "Admin sent this lead back for follow-up.",
    });

    await recordAudit({
      userId: admin.id,
      action: "lead_sent_back",
      entity: "lead",
      entityId: lead.id,
      details: { businessName: lead.businessName, ownerId: lead.ownerId },
    });

    revalidateAdmin();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
