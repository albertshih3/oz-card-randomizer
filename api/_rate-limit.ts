import { createHash } from "node:crypto";
import type { VercelResponse } from "@vercel/node";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "./_firebase-admin.js";

export interface RateLimit {
  /** Names the limit, and keeps separate limits from sharing a counter. */
  bucket: string;
  /** Who is being limited. Hashed before storage, so raw IPs are never kept. */
  key: string;
  limit: number;
  windowSeconds: number;
  /** "deny" protects a paid or abusable action when the limiter is down. */
  whenUnavailable: "allow" | "deny";
}

/**
 * Fixed-window limiter in Firestore, shared across serverless instances where
 * an in-memory counter would not be. Firestore rules deny all client access to
 * rateLimits. Set a TTL policy on `expiresAt` to expire old windows.
 *
 * Returns false after responding with 429 or 503.
 */
export async function enforceRateLimit(
  res: VercelResponse,
  { bucket, key, limit, windowSeconds, whenUnavailable }: RateLimit,
): Promise<boolean> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowIndex = Math.floor(now / windowMs);
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 32);

  try {
    const db = getFirestore(getFirebaseAdminApp());
    const ref = db.doc(`rateLimits/${bucket}-${digest}-${windowIndex}`);
    const count = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const current = (snapshot.get("count") as number | undefined) ?? 0;
      if (current < limit) {
        tx.set(
          ref,
          {
            count: FieldValue.increment(1),
            expiresAt: Timestamp.fromMillis((windowIndex + 2) * windowMs),
          },
          { merge: true },
        );
      }
      return current;
    });

    if (count < limit) return true;

    const retryAfter = Math.ceil(((windowIndex + 1) * windowMs - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many requests. Try again later." });
    return false;
  } catch (err) {
    console.error(`[rate-limit:${bucket}] unavailable`, err);
    if (whenUnavailable === "allow") return true;
    res.status(503).json({ error: "Temporarily unavailable. Try again." });
    return false;
  }
}
