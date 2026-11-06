import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { syncFirebaseIdentity } from "@/lib/firebase-auth";

/** Signs Firebase out whenever Clerk signs out or switches user. */
export function FirebaseSessionSync() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    syncFirebaseIdentity(userId ?? null).catch((err) => {
      console.error("Failed to sync Firebase session:", err);
    });
  }, [isLoaded, userId]);

  return null;
}
