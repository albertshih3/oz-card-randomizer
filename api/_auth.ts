import { createClerkClient, verifyToken } from "@clerk/backend";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export interface AuthPayload {
  userId: string;
}

/**
 * Extracts the Bearer token from Authorization header, verifies it with
 * Clerk, and returns the decoded payload. Sends a 401 and throws if
 * verification fails -- callers must not proceed after this throws.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthPayload> {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    throw new Error("Missing token");
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return { userId: payload.sub };
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    throw new Error("Invalid token");
  }
}

export { clerkClient };
