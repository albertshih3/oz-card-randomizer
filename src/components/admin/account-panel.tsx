import { useClerk, useUser } from "@clerk/clerk-react";
import { ExternalLink } from "lucide-react";

export function AccountPanel() {
  const { openUserProfile } = useClerk();
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;

  return (
    <button
      onClick={() => openUserProfile()}
      className="flex items-center gap-4 w-full rounded-3xl p-5 border text-left transition-opacity hover:opacity-80"
      style={{
        background: "var(--md-sys-color-surface)",
        borderColor: "var(--md-sys-color-outline-variant)",
      }}
    >
      {user?.imageUrl ? (
        <img
          src={user.imageUrl}
          alt="Profile"
          className="w-12 h-12 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-title-medium shrink-0"
          style={{
            background: "var(--md-sys-color-primary-container)",
            color: "var(--md-sys-color-on-primary-container)",
          }}
        >
          {(
            user?.firstName?.[0] ??
            user?.primaryEmailAddress?.emailAddress?.[0] ??
            ""
          ).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p
          className="text-label-large truncate"
          style={{ color: "var(--md-sys-color-on-surface)" }}
        >
          {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
            user?.primaryEmailAddress?.emailAddress}
        </p>
        <p
          className="text-body-medium truncate"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          Manage your account
        </p>
      </div>

      <ExternalLink
        size={16}
        className="shrink-0"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      />
    </button>
  );
}
