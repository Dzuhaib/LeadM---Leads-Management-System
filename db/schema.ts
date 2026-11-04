import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "employee"]);
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "pending",
  "deactivated",
]);
export const channelEnum = pgEnum("channel", [
  "linkedin",
  "whatsapp",
  "facebook",
  "other",
]);
export const servicePitchedEnum = pgEnum("service_pitched", [
  "AI Systems",
  "Automations",
  "SEO & GEO",
  "Digital Marketing",
  "Web Development",
  "Desktop Software",
  "other",
]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "replied",
  "call_booked",
  "proposal_sent",
  "won",
  "lost",
  "no_reply",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "dm_sent",
  "follow_up_3",
  "follow_up_7",
  "follow_up_14",
  "reply_received",
  "call_booked",
  "proposal_sent",
  "won",
  "lost",
  "note",
  "status_change",
]);
export const replyTagEnum = pgEnum("reply_tag", [
  "interested",
  "question",
  "not_now",
  "not_interested",
  "other",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull().default(""),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("employee"),
  status: userStatusEnum("status").notNull().default("active"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactName: text("contact_name").notNull().default(""),
    businessName: text("business_name").notNull(),
    jobTitle: text("job_title"),
    industry: text("industry"),
    country: text("country"),
    channel: channelEnum("channel").notNull().default("linkedin"),
    source: text("source"),
    profileUrl: text("profile_url"),
    email: text("email"),
    phone: text("phone"),
    observation: text("observation"),
    serviceWanted: text("service_wanted"),
    servicePitched: servicePitchedEnum("service_pitched").notNull().default("AI Systems"),
    status: leadStatusEnum("status").notNull().default("new"),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    followUpStage: integer("follow_up_stage").notNull().default(0),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("leads_owner_status_idx").on(table.ownerId, table.status),
    index("leads_next_follow_up_idx").on(table.nextFollowUpAt),
    index("leads_profile_url_idx").on(table.profileUrl),
    index("leads_business_name_idx").on(table.businessName),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    channel: channelEnum("channel").notNull().default("linkedin"),
    replyText: text("reply_text"),
    replyTag: replyTagEnum("reply_tag"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activities_user_occurred_idx").on(table.userId, table.occurredAt),
    index("activities_lead_occurred_idx").on(table.leadId, table.occurredAt),
  ],
);

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  timezone: text("timezone").notNull().default("Asia/Karachi"),
  dailyNewLeadsTarget: integer("daily_new_leads_target").notNull().default(20),
  dailyMessagesTarget: integer("daily_messages_target").notNull().default(15),
  followUpDays: jsonb("follow_up_days")
    .$type<number[]>()
    .notNull()
    .default([3, 7, 14]),
  noReplyAfterDays: integer("no_reply_after_days").notNull().default(14),
  requireApproval: boolean("require_approval").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: channelEnum("channel").notNull(),
    stage: integer("stage").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("message_templates_channel_stage_idx").on(
      table.channel,
      table.stage,
    ),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("audit_log_created_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
