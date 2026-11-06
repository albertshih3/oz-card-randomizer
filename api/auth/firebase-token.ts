import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "firebase-admin/auth";
import { requireApproved } from "../_auth.js";
import { getFirebaseAdminApp } from "../_firebase-admin.js";

/**
 * How long a Firebase session may write after its approval was last confirmed.
 * Firestore rules enforce `approvedUntil`, and this is the maximum time a
 * revoked user keeps write access. Custom-token claims survive ID-token refresh,
 * so the expiry has to live in the claim rather than in token lifetime.
 */
export const APPROVAL_LEASE_SECONDS = 15 * 60;

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

  try {
    const approvedUntil =
      Math.floor(Date.now() / 1000) + APPROVAL_LEASE_SECONDS;
    const token = await getAuth(getFirebaseAdminApp()).createCustomToken(
      userId,
      { approved: true, approvedUntil },
    );
    res.status(200).json({ token, approvedUntil });
  } catch (err) {
    console.error("[POST /api/auth/firebase-token]", err);
    res.status(503).json({ error: "Editing is temporarily unavailable." });
  }
}
