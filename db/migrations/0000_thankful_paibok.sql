CREATE TYPE "public"."activity_type" AS ENUM('dm_sent', 'follow_up_3', 'follow_up_7', 'follow_up_14', 'reply_received', 'call_booked', 'proposal_sent', 'won', 'lost', 'note', 'status_change');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('linkedin', 'whatsapp', 'facebook', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'replied', 'call_booked', 'proposal_sent', 'won', 'lost', 'no_reply');--> statement-breakpoint
CREATE TYPE "public"."reply_tag" AS ENUM('interested', 'question', 'not_now', 'not_interested', 'other');--> statement-breakpoint
CREATE TYPE "public"."service_pitched" AS ENUM('AI Systems', 'Automations', 'SEO & GEO', 'Digital Marketing', 'Web Development', 'Desktop Software', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'employee');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'pending', 'deactivated');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"channel" "channel" DEFAULT 'linkedin' NOT NULL,
	"reply_text" text,
	"reply_tag" "reply_tag",
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"business_name" text NOT NULL,
	"job_title" text,
	"industry" text,
	"country" text,
	"channel" "channel" DEFAULT 'linkedin' NOT NULL,
	"source" text,
	"profile_url" text,
	"email" text,
	"phone" text,
	"observation" text,
	"service_pitched" "service_pitched" DEFAULT 'AI Systems' NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"next_follow_up_at" timestamp with time zone,
	"follow_up_stage" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "channel" NOT NULL,
	"stage" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" text DEFAULT 'Asia/Karachi' NOT NULL,
	"daily_new_leads_target" integer DEFAULT 20 NOT NULL,
	"daily_messages_target" integer DEFAULT 15 NOT NULL,
	"follow_up_days" jsonb DEFAULT '[3,7,14]'::jsonb NOT NULL,
	"no_reply_after_days" integer DEFAULT 14 NOT NULL,
	"require_approval" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'employee' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_occurred_idx" ON "activities" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activities_lead_occurred_idx" ON "activities" USING btree ("lead_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_owner_status_idx" ON "leads" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "leads_next_follow_up_idx" ON "leads" USING btree ("next_follow_up_at");--> statement-breakpoint
CREATE INDEX "leads_profile_url_idx" ON "leads" USING btree ("profile_url");--> statement-breakpoint
CREATE INDEX "leads_business_name_idx" ON "leads" USING btree ("business_name");--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_channel_stage_idx" ON "message_templates" USING btree ("channel","stage");