import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, clerkClient } from "../_auth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  try {
    await requireAuth(req, res);
  } catch {
    return;
  }

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string" || email.trim() === "") {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }

  const appUrl =
    process.env.APP_URL ??
    process.env.VITE_APP_URL ??
    "https://ozboosterpacks.albertshih.org";

  try {
    await clerkClient.invitations.createInvitation({
      emailAddress: email.trim(),
      redirectUrl: `${appUrl}/sign-in`,
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
