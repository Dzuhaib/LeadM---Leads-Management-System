import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { recomputeNoReplyStatuses } from "@/lib/no-reply";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request, secret: string) {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const noReplyFilter = and(
    isNull(leads.deletedAt),
    eq(leads.status, "no_reply"),
  );

  const before = await db
    .select({ value: count() })
    .from(leads)
    .where(noReplyFilter)
    .then((rows) => Number(rows[0]?.value ?? 0));

  await recomputeNoReplyStatuses();

  const after = await db
    .select({ value: count() })
    .from(leads)
    .where(noReplyFilter)
    .then((rows) => Number(rows[0]?.value ?? 0));

  const updated = Math.max(0, after - before);

  await recordAudit({
    action: "no_reply_recomputed",
    entity: "workspace",
    details: { before, after, updated, source: "cron" },
  });

  return NextResponse.json({ ok: true, before, after, updated });
}
