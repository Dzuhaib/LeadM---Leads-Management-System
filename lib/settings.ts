import { db } from "@/db";
import { settings, type Settings } from "@/db/schema";
import { getAppTimeZone } from "./date";

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(settings).limit(1);
  if (rows[0]) return rows[0];

  const [created] = await db
    .insert(settings)
    .values({ timezone: getAppTimeZone() })
    .returning();

  return created;
}

export function fallbackSettings(): Settings {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    timezone: getAppTimeZone(),
    dailyNewLeadsTarget: 20,
    dailyMessagesTarget: 15,
    followUpDays: [3, 7, 14],
    noReplyAfterDays: 14,
    requireApproval: false,
    updatedAt: new Date(),
  };
}
