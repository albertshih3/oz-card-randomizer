import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAuth, clerkClient } from "../_auth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).end();
    return;
  }

  try {
    await requireAuth(req, res);
  } catch {
    return;
  }

  try {
    const { data: users } = await clerkClient.users.getUserList({
      limit: 100,
    });
    const sanitized = users.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName,
      lastName: user.lastName,
      lastSignInAt: user.lastSignInAt,
    }));
    res.status(200).json(sanitized);
  } catch (err) {
    console.error("[GET /api/users/list]", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}
