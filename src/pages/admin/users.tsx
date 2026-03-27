import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { LinearProgress } from "@/components/m3/linear-progress";
import { M3Snackbar } from "@/components/m3/snackbar";
import { BottomSheet } from "@/components/m3/bottom-sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { listUsers, inviteUser } from "@/utils/admin-api";
import type { AdminUser } from "@/utils/admin-api";
import { AccountPanel } from "@/components/admin/account-panel";
import { X, Send } from "lucide-react";
import { M3Spinner } from "@/components/m3/spinner";
import { event } from "@/lib/gtag";

interface InviteFormContentProps {
  inviteEmail: string;
  inviteError: string | null;
  isSending: boolean;
  onEmailChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}

function InviteFormContent({
  inviteEmail,
  inviteError,
  isSending,
  onEmailChange,
  onSend,
  onClose,
}: InviteFormContentProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        label="Email address"
        type="email"
        value={inviteEmail}
        onValueChange={onEmailChange}
        isInvalid={!!inviteError}
        errorMessage={inviteError ?? undefined}
        isDisabled={isSending}
      />
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="flat" onPress={onClose} isDisabled={isSending}>
          Cancel
        </Button>
        <Button
          color="primary"
          onPress={onSend}
          isLoading={isSending}
          spinner={<M3Spinner size="sm" color="currentColor" />}
          startContent={<Send size={16} />}
        >
          Send Invite
        </Button>
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
      const data = await listUsers(token);
      setUsers(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
      setInviteEmail("");
      setSnackbarMessage(`Invite sent to ${trimmed}`);
      // Fire-and-forget: invite already succeeded; background re-fetch updates the list
      fetchUsers();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!inviteOpen) {
      setInviteEmail("");
      setInviteError(null);
      setIsSending(false);
    }
  }, [inviteOpen]);

  return (
    <div style={{ color: "var(--md-sys-color-on-surface)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-headline-small">Team Members</h2>
        <Button color="primary" onPress={() => setInviteOpen(true)}>
          Invite User
        </Button>
      </div>

      <LinearProgress visible={isLoading} className="mb-3" />

      {loadError && !isLoading && (
        <div className="text-center py-12">
          <p
            className="font-medium mb-1"
            style={{ color: "var(--md-sys-color-error)" }}
          >
            Could not load team members
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            {loadError}
          </p>
          <Button size="sm" variant="flat" onPress={fetchUsers}>
            Retry
          </Button>
        </div>
      )}
      {!loadError && users.length === 0 && !isLoading && (
        <div
          className="text-center py-12"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          No team members found.
        </div>
      )}

      {users.length > 0 && (
        <Table aria-label="Team members">
          <TableHeader>
            <TableColumn>Name</TableColumn>
            <TableColumn>Email</TableColumn>
            <TableColumn>Last Sign-In</TableColumn>
            <TableColumn>Status</TableColumn>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                    "\u2014"}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.lastSignInAt
                    ? new Date(user.lastSignInAt).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  {user.lastSignInAt ? (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: "var(--md-sys-color-primary-container)",
                        color: "var(--md-sys-color-on-primary-container)",
                      }}
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: "var(--md-sys-color-surface-variant)",
                        color: "var(--md-sys-color-on-surface-variant)",
                      }}
                    >
                      Invited
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isMobile ? (
        <BottomSheet
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          aria-labelledby="invite-title"
        >
          <div className="px-2 pb-6">
            <h2
              id="invite-title"
              className="text-title-large px-4 pt-2 pb-2"
              style={{ color: "var(--md-sys-color-on-surface)" }}
            >
              Invite User
            </h2>
            <InviteFormContent
              inviteEmail={inviteEmail}
              inviteError={inviteError}
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
          classNames={{
            base: "rounded-3xl",
            header: "border-b-0 pb-0",
          }}
        >
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="flex items-center justify-between">
                  <span
                    id="invite-title"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    Invite User
                  </span>
                  <button
                    onClick={() => setInviteOpen(false)}
                    aria-label="Close"
                    className="p-1 rounded-full"
                    style={{
                      color: "var(--md-sys-color-on-surface-variant)",
                    }}
                  >
                    <X size={20} />
                  </button>
                </ModalHeader>
                <ModalBody>
                  <InviteFormContent
                    inviteEmail={inviteEmail}
                    inviteError={inviteError}
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

      <div className="mt-12">
        <h2
          id="my-account"
          className="text-headline-small mb-4"
          style={{ color: "var(--md-sys-color-on-surface)" }}
        >
          My Account
        </h2>
        <AccountPanel />
      </div>

      <M3Snackbar
        message={snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
}
