import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSettings } from "./settings";

export async function recomputeNoReplyStatuses(ownerId?: string) {
  const appSettings = await getSettings();
  const days = Math.max(1, appSettings.noReplyAfterDays);

  const lastMessage = sql`(
    select max(a.occurred_at)
    from activities a
    where a.lead_id = leads.id
      and a.type in ('dm_sent', 'follow_up_3', 'follow_up_7', 'follow_up_14')
  )`;

  const ownerFilter = ownerId ? sql`and leads.owner_id = ${ownerId}` : sql``;

  await db.execute(sql`
    update leads
    set status = 'no_reply',
        next_follow_up_at = null,
        updated_at = now()
    where leads.deleted_at is null
      and leads.status not in ('replied', 'won', 'lost', 'no_reply')
      and ${lastMessage} is not null
      and ${lastMessage} <= now() - (${days}::int * interval '1 day')
      and not exists (
        select 1 from activities r
        where r.lead_id = leads.id
          and r.type = 'reply_received'
          and r.occurred_at >= ${lastMessage}
      )
      ${ownerFilter}
  `);
}
