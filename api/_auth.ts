import { createClerkClient, verifyToken } from "@clerk/backend";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

const PRODUCTION_ORIGIN = "https://ozboosterpacks.albertshih.org";

export interface AuthPayload {
  userId: string;
}

/**
 * Origins allowed to present a Clerk session token. Enumerated rather than
 * pattern-matched: production, this deployment's own preview URLs, anything in
 * AUTHORIZED_PARTIES, and localhost outside production.
 */
export function authorizedParties(): string[] {
  const parties = new Set([PRODUCTION_ORIGIN]);
  for (const origin of (process.env.AUTHORIZED_PARTIES ?? "").split(",")) {
    if (origin.trim()) parties.add(origin.trim());
  }
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) parties.add(`https://${host}`);
  }
  if (process.env.VERCEL_ENV !== "production") {
    parties.add("http://localhost:3000");
    parties.add("http://localhost:5173");
  }
  return [...parties];
}

/**
 * Approval lives in Clerk publicMetadata, which only the Backend API can write.
 * Invitations set it, so it reaches the user on acceptance. Strict comparison:
 * a missing or truthy-looking value is not approval.
 */
export function isApproved(publicMetadata: unknown): boolean {
  return (
    typeof publicMetadata === "object" &&
    publicMetadata !== null &&
    (publicMetadata as { approved?: unknown }).approved === true
  );
}

/**
 * Verifies the Bearer token and confirms the user is currently approved.
 * Responds 401 for a missing or invalid identity, 403 for a valid but
 * unapproved one, and 503 if approval cannot be checked. Callers must not
 * proceed after this throws. Approval is read fresh on every call so a
 * revocation takes effect immediately on the API.
 */
export async function requireApproved(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthPayload> {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    throw new Error("Missing token");
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      authorizedParties: authorizedParties(),
    });
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    throw new Error("Invalid token");
  }

  let approved: boolean;
  try {
    const user = await clerkClient.users.getUser(userId);
    approved = isApproved(user.publicMetadata);
  } catch (err) {
    console.error("[requireApproved] approval lookup failed", err);
    res.status(503).json({ error: "Unable to verify access. Try again." });
    throw new Error("Approval lookup failed");
  }

  if (!approved) {
    res.status(403).json({ error: "Your account has not been approved." });
    throw new Error("Not approved");
  }

  return { userId };
}

export { clerkClient };
