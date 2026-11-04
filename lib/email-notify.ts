import { sendReplyReceivedEmail } from "./email";
import type { Lead } from "@/db/schema";
import type { ReplyEmailContext } from "./email-types";

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
    const actorName = actor.fullName || actor.email;
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim();

    const recipients = [adminEmail, actor.email].filter(Boolean);

    const context: ReplyEmailContext = {
      leadId: lead.id,
      contactName: lead.contactName,
      businessName: lead.businessName,
      channel: lead.channel,
      replyTag: input.replyTag,
      replyText: input.replyText,
      occurredAt,
      actorName,
      ownerName: actorName,
    };

    await sendReplyReceivedEmail(recipients, context);
  } catch (error) {
    console.error(
      `[email] reply notification failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
