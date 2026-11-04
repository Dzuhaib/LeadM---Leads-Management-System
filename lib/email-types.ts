export interface ReplyEmailContext {
  leadId: string;
  contactName: string;
  businessName: string;
  channel: string;
  replyTag?: string | null;
  replyText?: string | null;
  occurredAt: Date;
  actorName: string;
  ownerName: string;
}
