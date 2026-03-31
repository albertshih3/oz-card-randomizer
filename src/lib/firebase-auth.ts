import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type GetToken = (opts?: { template: string }) => Promise<string | null>;

/**
 * Ensures the current browser session is authenticated with Firebase.
 * Calls getToken with the "integration_firebase" template to obtain a
 * Clerk-issued custom token, then signs in via signInWithCustomToken.
 * No-ops if auth.currentUser is already set.
 */
export async function ensureFirebaseAuth(getToken: GetToken): Promise<void> {
  if (!auth.currentUser) {
    const token = await getToken({ template: "integration_firebase" });
    await signInWithCustomToken(auth, token || "");
  }
}
