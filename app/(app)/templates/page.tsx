import { and, asc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import {
  TemplateLibrary,
  type TemplateTree,
} from "@/components/templates/template-library";
import { db } from "@/db";
import { leads, messageTemplates } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { getSettings } from "@/lib/settings";
import type { Channel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const user = await requireActiveUser();

  const [settingsRow, templateRows, leadRows] = await Promise.all([
    getSettings(),
    db.select().from(messageTemplates),
    db
      .select({
        id: leads.id,
        contactName: leads.contactName,
        businessName: leads.businessName,
      })
      .from(leads)
      .where(and(eq(leads.ownerId, user.id), isNull(leads.deletedAt)))
      .orderBy(asc(leads.businessName))
      .limit(200),
  ]);

  const templates = JSON.parse(
    JSON.stringify(DEFAULT_TEMPLATES),
  ) as TemplateTree;

  for (const row of templateRows) {
    const channel = row.channel as Channel;
    if (!templates[channel]) continue;
    templates[channel][String(row.stage)] = {
      title: row.title,
      body: row.body,
    };
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Message templates"
        description="Copy-ready first messages and day 3, 7 and 14 follow-ups for every channel."
      />
      <TemplateLibrary
        templates={templates}
        leads={leadRows}
        followUpDays={settingsRow.followUpDays}
      />
    </div>
  );
}
