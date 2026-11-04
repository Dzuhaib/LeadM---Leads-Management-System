"use server";

import { revalidatePath } from "next/cache";
import { ActionError, toActionError, type ActionResult } from "@/lib/action-result";
import { recordAudit } from "@/lib/audit";
import { getCurrentDbUser } from "@/lib/auth";
import {
  analyzeImportFile as analyzeFile,
  importLeadsFromFile,
  previewImportFile as previewFile,
} from "@/lib/import-server";
import type {
  ImportPreview,
  ImportResult,
  ImportSheetAnalysis,
} from "@/lib/import-fields";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

async function requireActiveAction() {
  const user = await getCurrentDbUser();
  if (!user) throw new ActionError("You must be signed in.");
  if (user.status !== "active") throw new ActionError("Your account is not active.");
  return user;
}

function enforceRateLimit(userId: string, action: string, limit: number, windowMs: number) {
  const result = checkRateLimit(rateLimitKey(userId, action), limit, windowMs);
  if (!result.ok) {
    throw new ActionError("Too many import requests. Please wait a moment.");
  }
}

export async function analyzeImport(
  formData: FormData,
): Promise<ActionResult<ImportSheetAnalysis>> {
  try {
    const user = await requireActiveAction();
    enforceRateLimit(user.id, "import:analyze", 30, 60_000);
    return { ok: true, data: await analyzeFile(formData) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function previewImport(
  formData: FormData,
): Promise<ActionResult<ImportPreview>> {
  try {
    const user = await requireActiveAction();
    enforceRateLimit(user.id, "import:preview", 30, 60_000);
    return { ok: true, data: await previewFile(formData) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function confirmImport(
  formData: FormData,
): Promise<ActionResult<ImportResult>> {
  try {
    const user = await requireActiveAction();
    enforceRateLimit(user.id, "import:confirm", 5, 10 * 60_000);

    const result = await importLeadsFromFile(formData, user.id);

    await recordAudit({
      userId: user.id,
      action: "leads_imported",
      entity: "lead",
      details: {
        fileName: result.fileName,
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
      },
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    revalidatePath("/admin/leads");
    revalidatePath("/admin/replies");
    revalidatePath("/admin/employees");

    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}
