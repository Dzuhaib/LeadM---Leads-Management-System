"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { messageTemplates, settings } from "@/db/schema";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { getCurrentDbUser } from "@/lib/auth";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { TEMPLATE_STAGES, type TemplateStage } from "@/lib/templates";
import {
  settingsUpdateSchema,
  templateUpdateSchema,
} from "@/lib/validation";

async function requireAdminAction() {
  const user = await getCurrentDbUser();
  if (!user) throw new ActionError("You must be signed in.");
  if (user.status !== "active") throw new ActionError("Your account is not active.");
  if (user.role !== "admin") throw new ActionError("Admin access required.");
  return user;
}

function enforceRateLimit(userId: string, action: string) {
  const result = checkRateLimit(rateLimitKey(userId, action), 30, 60_000);
  if (!result.ok) {
    throw new ActionError("Too many changes. Please wait a moment and try again.");
  }
}

function revalidateSettings() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/audit");
  revalidatePath("/admin");
  revalidatePath("/admin/employees");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/templates");
}

export async function updateSettings(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    enforceRateLimit(admin.id, "admin:settings");
    const data = settingsUpdateSchema.parse(input);
    const current = await getSettings();

    await db
      .update(settings)
      .set({
        timezone: data.timezone,
        dailyNewLeadsTarget: data.dailyNewLeadsTarget,
        dailyMessagesTarget: data.dailyMessagesTarget,
        followUpDays: data.followUpDays,
        noReplyAfterDays: data.noReplyAfterDays,
        requireApproval: data.requireApproval,
        updatedAt: new Date(),
      })
      .where(eq(settings.id, current.id));

    await recordAudit({
      userId: admin.id,
      action: "settings_updated",
      entity: "settings",
      entityId: current.id,
      details: {
        from: {
          timezone: current.timezone,
          dailyNewLeadsTarget: current.dailyNewLeadsTarget,
          dailyMessagesTarget: current.dailyMessagesTarget,
          followUpDays: current.followUpDays,
          noReplyAfterDays: current.noReplyAfterDays,
          requireApproval: current.requireApproval,
        },
        to: data,
      },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTemplate(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    enforceRateLimit(admin.id, "admin:template");
    const data = templateUpdateSchema.parse(input);

    if (!TEMPLATE_STAGES.includes(data.stage as TemplateStage)) {
      throw new ActionError("Invalid template stage.");
    }

    await db
      .insert(messageTemplates)
      .values({
        channel: data.channel,
        stage: data.stage,
        title: data.title,
        body: data.body,
      })
      .onConflictDoUpdate({
        target: [messageTemplates.channel, messageTemplates.stage],
        set: {
          title: data.title,
          body: data.body,
          updatedAt: new Date(),
        },
      });

    await recordAudit({
      userId: admin.id,
      action: "template_updated",
      entity: "message_template",
      entityId: `${data.channel}:${data.stage}`,
      details: {
        channel: data.channel,
        stage: data.stage,
        title: data.title,
      },
    });

    revalidateSettings();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
