import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { User } from "@clerk/backend";
import { requireApproved, clerkClient } from "../_auth.js";

const PAGE_SIZE = 100;
/** Far above the expected team size. Bounds the work a single request can do. */
const MAX_USERS = 1000;

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
    await requireApproved(req, res);
  } catch {
    return;
  }

  res.setHeader("Cache-Control", "private, no-store");

  try {
    const users: User[] = [];
    for (let offset = 0; offset < MAX_USERS; offset += PAGE_SIZE) {
      const { data } = await clerkClient.users.getUserList({
        limit: PAGE_SIZE,
        offset,
      });
      users.push(...data);
      if (data.length < PAGE_SIZE) break;
    }
    const sanitized = users.map((user) => ({
      id: user.id,
      email:
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        "",
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
