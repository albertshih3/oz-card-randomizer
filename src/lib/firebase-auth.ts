import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type GetToken = (opts?: { template: string }) => Promise<string | null>;

/** Renew this long before the lease lapses so a write never races its expiry. */
const LEASE_MARGIN_SECONDS = 60;

interface Session {
  userId: string;
  approvedUntil: number;
}

let session: Session | null = null;
let pending: { userId: string; promise: Promise<void> } | null = null;
/** Bumped on every identity change. Stale sign-ins compare against this. */
let generation = 0;
let knownUserId: string | null | undefined;

function subjectOf(sessionToken: string): string {
  const payload = sessionToken.split(".")[1] ?? "";
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  const { sub } = JSON.parse(json) as { sub?: unknown };
  if (typeof sub !== "string" || !sub) {
    throw new Error("Session token has no subject");
  }
  return sub;
}

async function clearFirebaseSession(): Promise<void> {
  session = null;
  if (auth.currentUser) await signOut(auth);
}

async function requestFirebaseToken(
  sessionToken: string,
): Promise<{ token: string; approvedUntil: number }> {
  const res = await fetch("/api/auth/firebase-token", {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 401 || res.status === 403) await clearFirebaseSession();
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<{ token: string; approvedUntil: number }>;
}

async function signInAs(userId: string, sessionToken: string): Promise<void> {
  const startedIn = generation;
  const { token, approvedUntil } = await requestFirebaseToken(sessionToken);
  if (startedIn !== generation) throw new Error("Session changed");

  await signInWithCustomToken(auth, token);
  if (startedIn !== generation) {
    // The Clerk identity changed while signing in. This session is not theirs.
    await signOut(auth);
    throw new Error("Session changed");
  }
  session = { userId, approvedUntil };
}

/**
 * Keeps Firebase on the same identity as Clerk. Call on every Clerk user
 * change; pass null when signed out. Invalidates sign-ins already in flight.
 */
export async function syncFirebaseIdentity(
  userId: string | null,
): Promise<void> {
  if (userId === knownUserId) return;
  knownUserId = userId;
  generation += 1;
  pending = null;
  if (session?.userId !== userId || auth.currentUser?.uid !== userId) {
    await clearFirebaseSession();
  }
}

/**
 * Ensures Firebase is signed in as the current Clerk user with a live approval
 * lease. Run before every Firestore write. Concurrent callers share one
 * sign-in, and a missing Clerk session clears Firebase rather than proceeding.
 */
export async function ensureFirebaseAuth(getToken: GetToken): Promise<void> {
  const sessionToken = await getToken();
  if (!sessionToken) {
    await clearFirebaseSession();
    throw new Error("Your session has expired. Sign in again.");
  }

  const userId = subjectOf(sessionToken);
  const now = Math.floor(Date.now() / 1000);
  if (
    session?.userId === userId &&
    auth.currentUser?.uid === userId &&
    session.approvedUntil - LEASE_MARGIN_SECONDS > now
  ) {
    return;
  }

  if (pending?.userId !== userId) {
    const promise = signInAs(userId, sessionToken).finally(() => {
      if (pending?.promise === promise) pending = null;
    });
    pending = { userId, promise };
  }
  await pending.promise;
}

/** Test helper: resets module state between cases. */
export function resetFirebaseAuthState(): void {
  session = null;
  pending = null;
  generation = 0;
  knownUserId = undefined;
}
