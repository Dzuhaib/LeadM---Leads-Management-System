import Link from "next/link";
import { Download, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { TemplateEditDialog } from "@/components/admin/template-edit-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_STAGES,
  templateStageLabel,
} from "@/lib/templates";
import type { Channel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [settingsRow, templateRows] = await Promise.all([
    getSettings(),
    db.select().from(messageTemplates),
  ]);

  const byChannelStage = new Map(
    templateRows.map((row) => [`${row.channel}:${row.stage}`, row]),
  );

  const templateGroups = CHANNELS.map((channel) => ({
    channel,
    templates: TEMPLATE_STAGES.map((stage) => {
      const row = byChannelStage.get(`${channel}:${stage}`);
      const fallback =
        DEFAULT_TEMPLATES[channel][
          String(stage) as keyof (typeof DEFAULT_TEMPLATES)[Channel]
        ];
      return {
        channel,
        stage,
        title: row?.title ?? fallback.title,
        body: row?.body ?? fallback.body,
        stageLabel: templateStageLabel(stage, settingsRow.followUpDays),
      };
    }),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace rules, message templates, data export and the audit trail."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/audit">
              <ScrollText className="h-4 w-4" />
              View audit log
            </Link>
          </Button>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <SettingsForm
          settings={{
            timezone: settingsRow.timezone,
            dailyNewLeadsTarget: settingsRow.dailyNewLeadsTarget,
            dailyMessagesTarget: settingsRow.dailyMessagesTarget,
            followUpDays: settingsRow.followUpDays,
            noReplyAfterDays: settingsRow.noReplyAfterDays,
            requireApproval: settingsRow.requireApproval,
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Export and audit</CardTitle>
            <CardDescription>
              Download a complete workspace backup or review who changed what.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The Excel workbook contains Leads, Activities, Replies and an
              Employee Summary with the last 30 days of message counts. The JSON
              backup also includes users, templates, settings and the audit
              history. Store downloads somewhere safe; they contain client
              contact data.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href="/api/admin/export" download>
                  <Download className="h-4 w-4" />
                  Export all data (Excel)
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/admin/export?format=json" download>
                  <Download className="h-4 w-4" />
                  JSON backup
                </a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/audit">
                  <ScrollText className="h-4 w-4" />
                  Audit log
                </Link>
              </Button>
            </div>
            <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              Audit entries record lead deletes, employee status changes,
              reassignments, settings changes and template edits.
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Message templates</h2>
          <p className="text-sm text-muted-foreground">
            Employees copy these messages from the Templates page. Edit the copy
            for each channel and follow-up stage.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {templateGroups.map((group) => (
            <Card key={group.channel}>
              <CardHeader>
                <CardTitle>{CHANNEL_LABELS[group.channel]}</CardTitle>
                <CardDescription>
                  First message and the full follow-up sequence.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.templates.map((template) => (
                  <div
                    key={`${template.channel}-${template.stage}`}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold">
                          {template.stageLabel}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground">
                          {template.title}
                        </p>
                      </div>
                      <TemplateEditDialog
                        channel={template.channel}
                        stage={template.stage}
                        title={template.title}
                        body={template.body}
                        stageLabel={template.stageLabel}
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {template.body}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
