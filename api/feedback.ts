import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

const ALLOWED_TYPES = ["bug", "feature", "general", "other"] as const;
type FeedbackType = (typeof ALLOWED_TYPES)[number];

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  general: "General Feedback",
  other: "Other",
};

const TYPE_STYLES: Record<
  FeedbackType,
  {
    accent: string;
    accentSoft: string;
    foreground: string;
    eyebrow: string;
  }
> = {
  general: {
    accent: "#102f54",
    accentSoft: "#d4e3f7",
    foreground: "#001c37",
    eyebrow: "General note",
  },
  bug: {
    accent: "#b3261e",
    accentSoft: "#f9dedc",
    foreground: "#410e0b",
    eyebrow: "Bug report",
  },
  feature: {
    accent: "#006d3b",
    accentSoft: "#c6f0d2",
    foreground: "#00210f",
    eyebrow: "Feature request",
  },
  other: {
    accent: "#5d5e61",
    accentSoft: "#e3e2e6",
    foreground: "#1a1c1e",
    eyebrow: "Other feedback",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFeedbackEmailText({
  label,
  message,
  replyTo,
  timestamp,
}: {
  label: string;
  message: string;
  replyTo?: string;
  timestamp: string;
}): string {
  return [
    `New ${label}`,
    "OZ Booster Pack Generator",
    timestamp,
    "",
    message,
    "",
    replyTo ? `Reply-to: ${replyTo}` : "No reply-to address provided.",
  ].join("\n");
}

function buildFeedbackEmailHtml({
  type,
  label,
  message,
  replyTo,
  timestamp,
}: {
  type: FeedbackType;
  label: string;
  message: string;
  replyTo?: string;
  timestamp: string;
}): string {
  const theme = TYPE_STYLES[type];
  const safeLabel = escapeHtml(label);
  const safeMessage = escapeHtml(message);
  const safeTimestamp = escapeHtml(timestamp);
  const safeReplyTo = replyTo ? escapeHtml(replyTo) : undefined;
  const replyToMarkup = safeReplyTo
    ? `<a href="mailto:${safeReplyTo}" style="color:${theme.accent};text-decoration:none;">${safeReplyTo}</a>`
    : `<span style="color:#71747a;">No reply-to address provided.</span>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New ${safeLabel}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f9fc;color:#191c20;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f9fc;margin:0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dfe3eb;border-radius:28px;overflow:hidden;">
            <tr>
              <td style="background:${theme.accent};color:#ffffff;padding:28px 28px 24px;">
                <div style="display:inline-block;border-radius:999px;background:rgba(255,255,255,0.16);padding:6px 12px;font-size:13px;font-weight:700;letter-spacing:0.01em;">
                  ${escapeHtml(theme.eyebrow)}
                </div>
                <h1 style="margin:16px 0 6px;font-size:28px;line-height:1.18;font-weight:700;">
                  New ${safeLabel}
                </h1>
                <p style="margin:0;color:rgba(255,255,255,0.86);font-size:14px;line-height:1.5;">
                  OZ Booster Pack Generator · ${safeTimestamp}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <div style="border-radius:22px;background:${theme.accentSoft};color:${theme.foreground};padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;line-height:1.4;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${theme.accent};">
                    Message
                  </p>
                  <p style="margin:0;white-space:pre-wrap;font-size:16px;line-height:1.65;">
                    ${safeMessage}
                  </p>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border-top:1px solid #dfe3eb;">
                  <tr>
                    <td style="padding-top:16px;color:#42474f;font-size:14px;line-height:1.5;">
                      <strong style="color:#191c20;">Reply-to:</strong>
                      ${replyToMarkup}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  const { type, message, replyTo } = req.body as {
    type?: string;
    message?: string;
    replyTo?: string;
  };

  if (!type || !ALLOWED_TYPES.includes(type as FeedbackType)) {
    res.status(400).json({ error: "Invalid feedback type." });
    return;
  }

  if (!message || typeof message !== "string" || message.trim().length < 5) {
    res.status(400).json({ error: "Message must be at least 5 characters." });
    return;
  }

  if (message.trim().length > 2000) {
    res.status(400).json({ error: "Message must be under 2000 characters." });
    return;
  }

  if (replyTo) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(replyTo.trim())) {
      res.status(400).json({ error: "Invalid reply-to email address." });
      return;
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const feedbackType = type as FeedbackType;
  const label = TYPE_LABELS[feedbackType];
  const trimmedMessage = message.trim();
  const replyToAddress = replyTo?.trim() || undefined;
  const timestamp = new Date().toUTCString();

  try {
    await resend.emails.send({
      from: "OZ Booster Packs <feedback@albertshih.org>",
      to: "albertshih3@gmail.com",
      replyTo: replyToAddress,
      subject: `[Feedback] ${label} — OZ Booster Packs`,
      html: buildFeedbackEmailHtml({
        type: feedbackType,
        label,
        message: trimmedMessage,
        replyTo: replyToAddress,
        timestamp,
      }),
      text: buildFeedbackEmailText({
        label,
        message: trimmedMessage,
        replyTo: replyToAddress,
        timestamp,
      }),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[POST /api/feedback]", err);
    res
      .status(500)
      .json({ error: "Failed to send feedback. Please try again." });
  }
}
