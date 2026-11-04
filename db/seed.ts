import { db } from "./index";
import { messageTemplates, settings } from "./schema";
import type { Channel } from "@/lib/constants";
import { DEFAULT_TEMPLATES } from "@/lib/templates";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      // file may not exist
    }
  }
}

async function seed() {
  loadEnv();

  const existingSettings = await db.select().from(settings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(settings).values({
      timezone: process.env.APP_TIMEZONE ?? "Asia/Karachi",
    });
    console.log("Created default settings row.");
  } else {
    console.log("Settings row already exists.");
  }

  let templateCount = 0;
  for (const [channel, stages] of Object.entries(DEFAULT_TEMPLATES) as [
    Channel,
    Record<string, { title: string; body: string }>,
  ][]) {
    for (const [stage, template] of Object.entries(stages)) {
      const result = await db
        .insert(messageTemplates)
        .values({
          channel,
          stage: Number(stage),
          title: template.title,
          body: template.body,
        })
        .onConflictDoNothing({
          target: [messageTemplates.channel, messageTemplates.stage],
        })
        .returning({ id: messageTemplates.id });
      templateCount += result.length;
    }
  }
  console.log(`Inserted ${templateCount} default templates.`);

  if (process.env.SEED_SAMPLE_DATA === "true") {
    console.log(
      "SEED_SAMPLE_DATA is enabled, but no demo clients are bundled. Add your own fixtures if needed.",
    );
  } else {
    console.log("No demo clients seeded (SEED_SAMPLE_DATA is off by default).");
  }
}

seed()
  .then(() => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
