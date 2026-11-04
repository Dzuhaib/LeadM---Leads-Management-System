import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { activities, leads, users } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { getCurrentDbUser } from "@/lib/auth";
import { buildEmployeeWorkbook } from "@/lib/excel-export";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseIds(value: string | null) {
  if (!value) return null;
  const ids = Array.from(
    new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
  if (ids.length === 0) return null;
  if (ids.length > 500) {
    throw new Error("Select up to 500 leads to export.");
  }
  if (ids.some((id) => !UUID_PATTERN.test(id))) {
    throw new Error("One or more selected leads are invalid.");
  }
  return ids;
}

export async function GET(request: Request) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "Account is not active" }, { status: 403 });
  }

  let ids: string[] | null;
  try {
    ids = parseIds(new URL(request.url).searchParams.get("ids"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid export request." },
      { status: 400 },
    );
  }

  const limit = checkRateLimit(rateLimitKey(user.id, "export:leads"), 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many exports. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const scope = and(
    eq(leads.ownerId, user.id),
    isNull(leads.deletedAt),
    ids ? inArray(leads.id, ids) : undefined,
  );

  const [leadRows, activityRows] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(scope)
      .orderBy(desc(leads.createdAt)),
    db
      .select({
        occurredAt: activities.occurredAt,
        businessName: leads.businessName,
        contactName: leads.contactName,
        employeeName: users.fullName,
        type: activities.type,
        channel: activities.channel,
        replyTag: activities.replyTag,
        replyText: activities.replyText,
        note: activities.note,
      })
      .from(activities)
      .innerJoin(leads, eq(activities.leadId, leads.id))
      .innerJoin(users, eq(activities.userId, users.id))
      .where(scope)
      .orderBy(desc(activities.occurredAt)),
  ]);

  await recordAudit({
    userId: user.id,
    action: "data_exported",
    entity: "lead",
    details: {
      format: "xlsx",
      scope: ids ? "selected" : "own",
      leads: leadRows.length,
      activities: activityRows.length,
    },
  });

  const buffer = await buildEmployeeWorkbook({
    leads: leadRows,
    activities: activityRows,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="aivized-leads-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
