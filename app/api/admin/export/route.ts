import { NextResponse } from "next/server";
import { desc, eq, getTableColumns, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  auditLog,
  leads,
  messageTemplates,
  settings,
  users,
} from "@/db/schema";
import { getAdminDashboard } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { getCurrentDbUser } from "@/lib/auth";
import { resolveDateRange } from "@/lib/date";
import { buildAdminWorkbook } from "@/lib/excel-export";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin" || user.status !== "active") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const limit = checkRateLimit(rateLimitKey(user.id, "admin:export"), 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many exports. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const format =
    new URL(request.url).searchParams.get("format") === "json" ? "json" : "xlsx";
  const settingsRow = await getSettings();

  const leadSelection = {
    ...getTableColumns(leads),
    ownerName: users.fullName,
    ownerEmail: users.email,
  };

  const activitySelection = {
    occurredAt: activities.occurredAt,
    businessName: leads.businessName,
    contactName: leads.contactName,
    employeeName: users.fullName,
    type: activities.type,
    channel: activities.channel,
    replyTag: activities.replyTag,
    replyText: activities.replyText,
    note: activities.note,
  };

  if (format === "json") {
    const [
      userRows,
      leadRows,
      activityRows,
      settingsRows,
      templateRows,
      auditRows,
    ] = await Promise.all([
      db.select().from(users),
      db.select().from(leads),
      db.select().from(activities),
      db.select().from(settings),
      db.select().from(messageTemplates),
      db.select().from(auditLog),
    ]);

    await recordAudit({
      userId: user.id,
      action: "data_exported",
      entity: "workspace",
      details: {
        format: "json",
        counts: {
          users: userRows.length,
          leads: leadRows.length,
          activities: activityRows.length,
          messageTemplates: templateRows.length,
          auditLog: auditRows.length,
        },
      },
    });

    const exportedAt = new Date();
    const payload = {
      exportedAt: exportedAt.toISOString(),
      exportedBy: { id: user.id, email: user.email },
      users: userRows,
      leads: leadRows,
      activities: activityRows,
      settings: settingsRows,
      messageTemplates: templateRows,
      auditLog: auditRows,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="aivized-backup-${exportedAt
          .toISOString()
          .slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const [leadRows, activityRows, dashboard] = await Promise.all([
    db
      .select(leadSelection)
      .from(leads)
      .leftJoin(users, eq(leads.ownerId, users.id))
      .where(isNull(leads.deletedAt))
      .orderBy(desc(leads.createdAt)),
    db
      .select(activitySelection)
      .from(activities)
      .innerJoin(leads, eq(activities.leadId, leads.id))
      .innerJoin(users, eq(activities.userId, users.id))
      .where(isNull(leads.deletedAt))
      .orderBy(desc(activities.occurredAt)),
    getAdminDashboard({
      range: resolveDateRange("30d", settingsRow.timezone),
      timeZone: settingsRow.timezone,
    }),
  ]);

  const summary = {
    days: dashboard.days,
    members: dashboard.members.map((member) => ({
      name: member.fullName || member.email,
      email: member.email,
      counts: Object.fromEntries(
        dashboard.dailyByEmployee.map((day) => [
          day.day as string,
          Number(day[member.id] ?? 0),
        ]),
      ),
    })),
  };

  const buffer = await buildAdminWorkbook({
    leads: leadRows,
    activities: activityRows,
    replies: activityRows.filter((row) => row.type === "reply_received"),
    summary,
  });

  await recordAudit({
    userId: user.id,
    action: "data_exported",
    entity: "workspace",
    details: {
      format: "xlsx",
      counts: {
        leads: leadRows.length,
        activities: activityRows.length,
        replies: activityRows.filter((row) => row.type === "reply_received")
          .length,
        employees: summary.members.length,
      },
    },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="aivized-all-data-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
