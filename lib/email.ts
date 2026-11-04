const APP_URL_DEFAULT = "https://leadm.aivized.com";

export type { ReplyEmailContext } from "./email-types";

import type { ReplyEmailContext } from "./email-types";

interface ResendSendInput {
  to: string;
  subject: string;
  html: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appUrl() {
  return (process.env.APP_URL || APP_URL_DEFAULT).replace(/\/$/, "");
}

export async function sendEmail(input: ResendSendInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] RESEND_API_KEY is not set; skipping email send.");
    }
    return false;
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
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[email] Resend send failed (${response.status}): ${body}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      `[email] Resend request error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

function renderReplyEmail(context: ReplyEmailContext) {
  const leadUrl = `${appUrl()}/leads`;
  const contact = context.contactName || "Unnamed contact";
  const tag = context.replyTag ? escapeHtml(context.replyTag) : null;
  const reply = context.replyText ? escapeHtml(context.replyText) : null;
  const occurred = escapeHtml(
    context.occurredAt.toLocaleString("en-GB", {
      timeZone:
        process.env.APP_TIMEZONE ||
        "Asia/Karachi",
      dateStyle: "medium",
      timeStyle: "short",
    }),
  );

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#bc542f;padding:16px 24px;">
                <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:2px;">AIVIZED LEAD TRACKER</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 8px;font-size:20px;color:#1d1d1f;">Reply received</h1>
                <p style="margin:0 0 16px;font-size:14px;color:#6e6e73;">
                  ${escapeHtml(context.ownerName)} received a reply. The follow-up sequence for this lead has been stopped.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d2d2d7;border-radius:8px;">
                  <tr>
                    <td style="padding:12px 16px;border-bottom:1px solid #d2d2d7;font-size:14px;color:#1d1d1f;">
                      <strong>${escapeHtml(contact)}</strong>${context.businessName ? ` &middot; ${escapeHtml(context.businessName)}` : ""}
                    </td>
                    <td style="padding:12px 16px;border-bottom:1px solid #d2d2d7;font-size:13px;color:#6e6e73;text-align:right;">
                      ${escapeHtml(context.channel)}
                    </td>
                  </tr>
                  ${tag ? `<tr><td colspan="2" style="padding:12px 16px;border-bottom:1px solid #d2d2d7;font-size:13px;color:#6e6e73;">Reply tag: <strong style="color:#1d1d1f;">${tag}</strong></td></tr>` : ""}
                  ${reply ? `<tr><td colspan="2" style="padding:12px 16px;border-bottom:1px solid #d2d2d7;font-size:14px;color:#1d1d1f;white-space:pre-wrap;">&ldquo;${reply}&rdquo;</td></tr>` : ""}
                  <tr>
                    <td colspan="2" style="padding:12px 16px;font-size:13px;color:#6e6e73;">
                      Logged by ${escapeHtml(context.actorName)} &middot; ${occurred} (${process.env.APP_TIMEZONE || "Asia/Karachi"})
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;">
                  <a href="${leadUrl}" style="display:inline-block;background:#bc542f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">Open leads</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #d2d2d7;font-size:12px;color:#6e6e73;">
                You are receiving this notification because you are a team member on AIVized Lead Tracker.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendReplyReceivedEmail(
  recipients: string[],
  context: ReplyEmailContext,
): Promise<void> {
  const unique = [...new Set(recipients.map((v) => v.trim().toLowerCase()).filter(Boolean))];
  if (unique.length === 0) return;

  await Promise.all(
    unique.map((to) =>
      sendEmail({
        to,
        subject: `Reply received: ${context.businessName}`,
        html: renderReplyEmail(context),
      }),
    ),
  );
}
