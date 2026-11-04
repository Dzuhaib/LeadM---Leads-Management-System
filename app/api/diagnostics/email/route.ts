import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

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

  const config = {
    RESEND_API_KEY_set: Boolean(process.env.RESEND_API_KEY),
    EMAIL_FROM: process.env.EMAIL_FROM || null,
    ADMIN_EMAIL_set: Boolean(process.env.ADMIN_EMAIL),
    APP_URL: process.env.APP_URL || null,
  };

  const adminEmail = (process.env.ADMIN_EMAIL || "").trim();
  if (!adminEmail) {
    return NextResponse.json({ config, error: "ADMIN_EMAIL is not set." }, { status: 500 });
  }

  let resendStatus: number | null = null;
  let resendResponse: string | null = null;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { config, error: "RESEND_API_KEY is not set. Test email was not attempted." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Leadm <leadm@aivized.com>",
        to: [adminEmail],
        subject: "Leadm diagnostics: test email",
        html: "<p>If you can read this, Resend sending works from Leadm.</p>",
      }),
    });
    resendStatus = response.status;
    resendResponse = (await response.text()).slice(0, 500);
  } catch (error) {
    resendResponse = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json({
    config,
    test: { attempted: true, to: adminEmail, resendStatus, resendResponse },
  });
}
