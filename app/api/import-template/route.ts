import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { buildImportTemplateWorkbook } from "@/lib/excel-export";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.status !== "active") {
    return NextResponse.json({ error: "Account is not active" }, { status: 403 });
  }

  const limit = checkRateLimit(
    rateLimitKey(user.id, "import:template"),
    10,
    60_000,
  );
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const buffer = await buildImportTemplateWorkbook();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="aivized-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
