import { useClerk } from "@clerk/react";
import { M3Button } from "@/components/m3/button";

/** Shown to signed-in accounts that have not been approved for admin access. */
export function NotApproved() {
  const { signOut } = useClerk();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--md-sys-color-background)" }}
    >
      <div
        role="alert"
        className="max-w-md rounded-[28px] border p-6 flex flex-col gap-4"
        style={{
          background: "var(--md-sys-color-surface)",
          borderColor: "var(--md-sys-color-outline-variant)",
        }}
      >
        <h1
          className="text-title-large"
          style={{ color: "var(--md-sys-color-on-surface)" }}
        >
          Your account isn&apos;t approved yet
        </h1>
        <p
          className="text-body-medium"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          You&apos;re signed in, but admin access requires an invitation. Ask an
          existing admin to invite this email address.
        </p>
        <div className="flex gap-2">
          <M3Button
            variant="filled"
            onPress={() => window.location.assign("/")}
          >
            Go to generator
          </M3Button>
          <M3Button variant="text" onPress={() => signOut()}>
            Sign out
          </M3Button>
        </div>
      </div>
    </div>
  );
}
