import { z } from "zod";
import {
  ACTIVITY_TYPES,
  CHANNELS,
  DATE_RANGES,
  LEAD_STATUSES,
  REPLY_TAGS,
  SERVICES,
} from "./constants";

const optionalText = (max = 500) => z.string().trim().max(max).optional();

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const dateInput = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || !Number.isNaN(new Date(value).getTime()),
    "Enter a valid date",
  );

export const leadInputSchema = z.object({
  contactName: optionalText(160).default(""),
  businessName: optionalText(200),
  jobTitle: optionalText(160),
  industry: optionalText(160),
  country: optionalText(120),
  channel: z.enum(CHANNELS),
  source: optionalText(200),
  profileUrl: optionalText(600),
  email: z
    .string()
    .trim()
    .max(220)
    .optional()
    .refine(
      (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "Enter a valid email address",
    ),
  phone: optionalText(60),
  observation: optionalText(2000),
  serviceWanted: optionalText(200).default(""),
  servicePitched: z.enum(SERVICES),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: optionalText(5000),
  allowDuplicate: z.boolean().optional(),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadUpdateSchema = leadInputSchema.partial().extend({
  id: z.string().uuid(),
});

export const activityInputSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(ACTIVITY_TYPES),
  occurredAt: dateInput,
  replyText: optionalText(4000),
  replyTag: z.enum(REPLY_TAGS).optional(),
  note: optionalText(4000),
});

export type ActivityInput = z.infer<typeof activityInputSchema>;

export const logReplySchema = z.object({
  leadId: z.string().uuid(),
  occurredAt: dateInput,
  replyText: z
    .string()
    .trim()
    .min(1, "Reply text is required")
    .max(4000, "Reply text is too long"),
  replyTag: z.enum(REPLY_TAGS),
});

export const logFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  occurredAt: dateInput,
});

export const leadListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  q: z.string().trim().max(200).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  channel: z.enum(CHANNELS).optional(),
  industry: z.string().trim().max(160).optional(),
  country: z.string().trim().max(120).optional(),
  due: z.enum(["today", "overdue", "all"]).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  sort: z
    .enum(["created_at", "business_name", "status", "next_follow_up_at"])
    .default("created_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export type LeadListParams = z.infer<typeof leadListParamsSchema>;

export const dateRangeParamsSchema = z.object({
  range: z.enum(DATE_RANGES).default("7d"),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

export const bulkStatusSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "Select at least one lead"),
  status: z.enum(LEAD_STATUSES),
});

export const duplicateCheckSchema = z.object({
  profileUrl: optionalText(600),
  businessName: optionalText(200),
  excludeLeadId: z.string().uuid().optional(),
});

export const employeeStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["active", "deactivated"]),
});

export const reassignLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "Select at least one lead"),
  ownerId: z.string().uuid(),
});

export const sendBackSchema = z.object({
  leadId: z.string().uuid(),
});

export const adminDashboardParamsSchema = dateRangeParamsSchema.extend({
  employee: z.string().uuid().optional(),
});

export const adminLeadListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  q: z.string().trim().max(200).optional(),
  owner: z.string().uuid().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  channel: z.enum(CHANNELS).optional(),
  sort: z
    .enum(["created_at", "business_name", "status", "next_follow_up_at", "owner"])
    .default("created_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export const settingsUpdateSchema = z.object({
  timezone: z
    .string()
    .trim()
    .min(1, "Time zone is required")
    .max(100)
    .refine(isValidTimeZone, "Enter a valid IANA time zone"),
  dailyNewLeadsTarget: z.coerce
    .number()
    .int()
    .min(1, "Daily new-leads target must be at least 1")
    .max(500),
  dailyMessagesTarget: z.coerce
    .number()
    .int()
    .min(1, "Daily messages target must be at least 1")
    .max(500),
  followUpDays: z
    .array(z.coerce.number().int().min(1).max(365))
    .length(3, "Provide three follow-up days")
    .refine(
      (days) => days[0] < days[1] && days[1] < days[2],
      "Follow-up days must be in ascending order",
    ),
  noReplyAfterDays: z.coerce
    .number()
    .int()
    .min(1, "No-reply threshold must be at least 1 day")
    .max(365),
  requireApproval: z.boolean(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export const templateUpdateSchema = z.object({
  channel: z.enum(CHANNELS),
  stage: z.coerce.number().int().min(0).max(365),
  title: z
    .string()
    .trim()
    .min(1, "Template title is required")
    .max(200, "Template title is too long"),
  body: z
    .string()
    .trim()
    .min(1, "Template body is required")
    .max(4000, "Template body is too long"),
});

export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

export const auditLogParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type AuditLogParams = z.infer<typeof auditLogParamsSchema>;

export const adminRepliesParamsSchema = z.object({
  tab: z.enum(["replies", "no_reply"]).default("replies"),
  employee: z.string().uuid().optional(),
  channel: z.enum(CHANNELS).optional(),
  tag: z.enum(REPLY_TAGS).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  sort: z.enum(["oldest", "newest", "stage"]).default("oldest"),
});

export type AdminLeadListParams = z.infer<typeof adminLeadListParamsSchema>;
export type AdminRepliesParams = z.infer<typeof adminRepliesParamsSchema>;

export function firstFormError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
