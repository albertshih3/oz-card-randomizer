import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

/**
 * Firebase Admin is server-only and bypasses security rules. The credential is
 * a base64-encoded service account JSON, matching the GA credential convention.
 * A missing or invalid credential throws so callers fail closed.
 */
export function getFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8"),
  );
  return initializeApp({ credential: cert(serviceAccount) });
}
