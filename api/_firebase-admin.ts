import { createSign } from "node:crypto";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/** Base64-encoded service account JSON, matching the GA credential convention. */
function readServiceAccount(): ServiceAccount {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

/**
 * Firebase Admin is server-only and bypasses security rules. A missing or
 * invalid credential throws so callers fail closed.
 */
export function getFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert(readServiceAccount() as unknown as string),
  });
}

const CUSTOM_TOKEN_AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

const base64Url = (value: string | Buffer) =>
  Buffer.from(value).toString("base64url");

/**
 * Signs a Firebase custom token. Done by hand because importing
 * `firebase-admin/auth` crashes on Vercel: its jwks-rsa dependency require()s an
 * ESM-only package, which the function runtime rejects. Format per
 * https://firebase.google.com/docs/auth/admin/create-custom-tokens
 */
export function createCustomToken(
  uid: string,
  claims: Record<string, unknown>,
): string {
  const { client_email, private_key } = readServiceAccount();
  const issuedAt = Math.floor(Date.now() / 1000);

  const unsigned = [
    base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64Url(
      JSON.stringify({
        iss: client_email,
        sub: client_email,
        aud: CUSTOM_TOKEN_AUDIENCE,
        iat: issuedAt,
        exp: issuedAt + 3600,
        uid,
        claims,
      }),
    ),
  ].join(".");

  const signature = createSign("RSA-SHA256").update(unsigned).sign(private_key);
  return `${unsigned}.${base64Url(signature)}`;
}
