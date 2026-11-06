import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireApproved, clerkClient } from "../_auth.js";
import { isValidEmail, readJsonObject } from "../_http.js";
import { enforceRateLimit } from "../_rate-limit.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  let userId: string;
  try {
    ({ userId } = await requireApproved(req, res));
  } catch {
    return;
  }

  const body = readJsonObject(req, res);
  if (!body) return;

  const { email } = body;
  if (typeof email !== "string" || email.trim() === "") {
    res.status(400).json({ error: "email is required" });
    return;
  }

  if (!isValidEmail(email.trim())) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }

  const allowed = await enforceRateLimit(res, {
    bucket: "invite",
    key: userId,
    limit: 20,
    windowSeconds: 3600,
    whenUnavailable: "allow",
  });
  if (!allowed) return;

  const appUrl =
    process.env.APP_URL ??
    process.env.VITE_APP_URL ??
    "https://ozboosterpacks.albertshih.org";

  try {
    await clerkClient.invitations.createInvitation({
      emailAddress: email.trim(),
      redirectUrl: `${appUrl}/sign-in`,
      // Copied to the user's publicMetadata when the invitation is accepted.
      publicMetadata: { approved: true },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[POST /api/users/invite]", err);
    const message =
      (err as { errors?: Array<{ message: string }> }).errors?.[0]?.message ??
      "Failed to send invitation";
    res.status(500).json({ error: message });
  }
}
