import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { M3Button } from "@/components/m3/button";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { LinearProgress } from "@/components/m3/linear-progress";
import { M3Snackbar } from "@/components/m3/snackbar";
import { BottomSheet } from "@/components/m3/bottom-sheet";
import { M3Spinner } from "@/components/m3/spinner";
import { useMediaQuery } from "@/hooks/use-media-query";
import { listUsers, inviteUser } from "@/utils/admin-api";
import type { AdminUser } from "@/utils/admin-api";
import { AccountPanel } from "@/components/admin/account-panel";
import { UserPlus, X, Send } from "lucide-react";
import { event } from "@/lib/gtag";

function UserAvatar({ user }: { user: AdminUser }) {
  const initials =
    [user.firstName?.[0], user.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || user.email[0].toUpperCase();

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-label-large shrink-0"
      style={{
        background: "var(--md-sys-color-secondary-container)",
        color: "var(--md-sys-color-on-secondary-container)",
      }}
    >
      {initials}
    </div>
  );
}

function InviteForm({
  email,
  error,
  isSending,
  onEmailChange,
  onSend,
  onClose,
}: {
  email: string;
  error: string | null;
  isSending: boolean;
  onEmailChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        label="Email address"
        type="email"
        value={email}
        onValueChange={onEmailChange}
        isInvalid={!!error}
        errorMessage={error ?? undefined}
        isDisabled={isSending}
      />
      <div className="flex gap-2 justify-end pt-2">
        <M3Button variant="tonal" onPress={onClose} isDisabled={isSending}>
          Cancel
        </M3Button>
        <M3Button
          variant="filled"
          onPress={onSend}
          isLoading={isSending}
          spinner={<M3Spinner size="sm" color="currentColor" />}
          startContent={<Send size={16} />}
        >
          Send Invite
        </M3Button>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) {
        setLoadError("Session expired. Please refresh the page.");
        return;
      }
      setUsers(await listUsers(token));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!inviteOpen) {
      setInviteEmail("");
      setInviteError(null);
      setIsSending(false);
    }
  }, [inviteOpen]);

  const handleInvite = async () => {
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setInviteError("Email address is required");
      return;
    }
    setIsSending(true);
    try {
      const token = await getToken();
      if (!token) {
        setInviteError("Session expired. Please refresh the page.");
        return;
      }
      await inviteUser(token, trimmed);
      event("user_invited", {});
      setInviteOpen(false);
      setSnackbarMessage(`Invite sent to ${trimmed}`);
      fetchUsers();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
      {/* My Account */}
      <section>
        <div className="flex items-center mb-3" style={{ minHeight: "2rem" }}>
          <p
            className="text-label-medium uppercase tracking-widest"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            My Account
          </p>
        </div>
        <AccountPanel />
      </section>

      {/* Team */}
      <section>
        <div
          className="flex items-center justify-between mb-3"
          style={{ minHeight: "2rem" }}
        >
          <p
            className="text-label-medium uppercase tracking-widest"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            Team{!isLoading && users.length > 0 && ` · ${users.length}`}
          </p>
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl text-label-large transition-opacity hover:opacity-80"
            style={{
              background: "var(--md-sys-color-primary-container)",
              color: "var(--md-sys-color-on-primary-container)",
            }}
          >
            <UserPlus size={15} />
            Invite
          </button>
        </div>

        <LinearProgress visible={isLoading} className="mb-2" />

        {loadError && !isLoading && (
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{
              background: "var(--md-sys-color-error-container)",
              color: "var(--md-sys-color-on-error-container)",
            }}
          >
            <p className="text-body-medium">{loadError}</p>
            <button
              onClick={fetchUsers}
              className="text-label-large hover:opacity-80 transition-opacity ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {!loadError && !isLoading && users.length === 0 && (
          <p
            className="text-body-medium py-6 text-center"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            No team members yet.
          </p>
        )}

        {users.length > 0 && (
          <div
            data-tutorial-id="users-table"
            className="rounded-3xl border overflow-hidden"
            style={{
              background: "var(--md-sys-color-surface)",
              borderColor: "var(--md-sys-color-outline-variant)",
            }}
          >
            {users.map((user, i) => (
              <div
                key={user.id}
                className="flex items-center gap-4 px-5 py-4"
                style={
                  i < users.length - 1
                    ? {
                        borderBottom:
                          "1px solid var(--md-sys-color-outline-variant)",
                      }
                    : undefined
                }
              >
                <UserAvatar user={user} />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-label-large truncate"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </p>
                  <p
                    className="text-body-medium truncate"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    {user.email}
                  </p>
                </div>
                <span
                  className="text-label-medium px-2.5 py-0.5 rounded-full shrink-0"
                  style={
                    user.lastSignInAt
                      ? {
                          background: "var(--md-sys-color-primary-container)",
                          color: "var(--md-sys-color-on-primary-container)",
                        }
                      : {
                          background: "var(--md-sys-color-surface-variant)",
                          color: "var(--md-sys-color-on-surface-variant)",
                        }
                  }
                >
                  {user.lastSignInAt ? "Active" : "Invited"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite sheet / modal */}
      {isMobile ? (
        <BottomSheet isOpen={inviteOpen} onClose={() => setInviteOpen(false)}>
          <div className="px-2 pb-6">
            <h2
              className="text-title-large px-4 pt-2 pb-2"
              style={{ color: "var(--md-sys-color-on-surface)" }}
            >
              Invite User
            </h2>
            <InviteForm
              email={inviteEmail}
              error={inviteError}
              isSending={isSending}
              onEmailChange={(v) => {
                setInviteEmail(v);
                setInviteError(null);
              }}
              onSend={handleInvite}
              onClose={() => setInviteOpen(false)}
            />
          </div>
        </BottomSheet>
      ) : (
        <Modal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          size="md"
          hideCloseButton
          classNames={{ base: "rounded-3xl", header: "border-b-0 pb-0" }}
        >
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="flex items-center justify-between">
                  <span style={{ color: "var(--md-sys-color-on-surface)" }}>
                    Invite User
                  </span>
                  <button
                    onClick={() => setInviteOpen(false)}
                    aria-label="Close"
                    className="p-1 rounded-full"
                    style={{ color: "var(--md-sys-color-on-surface-variant)" }}
                  >
                    <X size={20} />
                  </button>
                </ModalHeader>
                <ModalBody>
                  <InviteForm
                    email={inviteEmail}
                    error={inviteError}
                    isSending={isSending}
                    onEmailChange={(v) => {
                      setInviteEmail(v);
                      setInviteError(null);
                    }}
                    onSend={handleInvite}
                    onClose={() => setInviteOpen(false)}
                  />
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      <M3Snackbar
        message={snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
}
