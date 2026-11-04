import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Lead } from "@/db/schema";
import { sendReplyReceivedEmail } from "./email";
import type { ReplyEmailContext } from "./email-types";

export async function getLeadOwner(ownerId: string) {
  const rows = await db
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);
  return rows[0] ?? null;
}

interface NotifyReplyInput {
  lead: Lead;
  actor: { email: string; fullName: string; role: string };
  replyTag: string | null;
  replyText: string | null;
  occurredAt: Date;
}

export async function notifyReplyReceived(input: NotifyReplyInput) {
  try {
    const { lead, actor, occurredAt } = input;
    const owner = await getLeadOwner(lead.ownerId);

    const ownerName = owner?.fullName || owner?.email || "the lead owner";
    const actorName = actor.fullName || actor.email;
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim();

    const recipients = [owner?.email || "", adminEmail, actor.email].filter(Boolean);

    const context: ReplyEmailContext = {
      leadId: lead.id,
      contactName: lead.contactName,
      businessName: lead.businessName,
      channel: lead.channel,
      replyTag: input.replyTag,
      replyText: input.replyText,
      occurredAt,
      actorName,
      ownerName,
    };

    await sendReplyReceivedEmail(recipients, context);
  } catch (error) {
    console.error(
      `[email] reply notification failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
