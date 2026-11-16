ALTER TABLE "leads" ADD COLUMN "profile_key" text;--> statement-breakpoint
CREATE INDEX "leads_profile_key_idx" ON "leads" USING btree ("profile_key");--> statement-breakpoint
UPDATE "leads"
SET "profile_url" = btrim("profile_url")
WHERE "profile_url" IS NOT NULL
  AND "profile_url" <> btrim("profile_url");--> statement-breakpoint
UPDATE "leads"
SET "profile_url" = 'https://' || "profile_url"
WHERE "profile_url" IS NOT NULL
  AND "profile_url" <> ''
  AND "profile_url" NOT ILIKE 'http://%'
  AND "profile_url" NOT ILIKE 'https://%';--> statement-breakpoint
UPDATE "leads"
SET "profile_key" = NULLIF(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(trim("profile_url")), '^https?://', ''),
        '^www\.', ''
      ),
      '[?#].*$', ''
    ),
    '/+$', ''
  ),
  ''
)
WHERE "profile_url" IS NOT NULL;--> statement-breakpoint
UPDATE "social_posts"
SET "link_url" = btrim("link_url")
WHERE "link_url" <> btrim("link_url");--> statement-breakpoint
UPDATE "social_posts"
SET "image_url" = btrim("image_url")
WHERE "image_url" <> btrim("image_url");--> statement-breakpoint
UPDATE "social_posts"
SET "link_url" = 'https://' || "link_url"
WHERE "link_url" <> ''
  AND "link_url" NOT ILIKE 'http://%'
  AND "link_url" NOT ILIKE 'https://%';--> statement-breakpoint
UPDATE "social_posts"
SET "image_url" = 'https://' || "image_url"
WHERE "image_url" <> ''
  AND "image_url" NOT ILIKE 'http://%'
  AND "image_url" NOT ILIKE 'https://%';
