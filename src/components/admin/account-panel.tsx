import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { M3Snackbar } from "@/components/m3/snackbar";
import { M3Spinner } from "@/components/m3/spinner";

function extractClerkError(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown[] }).errors) &&
    (err as { errors: { longMessage?: string }[] }).errors[0]?.longMessage
  ) {
    return (err as { errors: { longMessage: string }[] }).errors[0].longMessage;
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}

interface ProfileFormErrors {
  firstName?: string;
}

interface PasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function AccountPanel() {
  const { user, isLoaded } = useUser();

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileErrors, setProfileErrors] = useState<ProfileFormErrors>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Snackbar
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user?.id]);

  const handleSaveProfile = async () => {
    const errors: ProfileFormErrors = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setIsSavingProfile(true);
    try {
      await user?.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setSnackbarMessage("Profile updated successfully.");
    } catch (err) {
      setSnackbarMessage(extractClerkError(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const errors: PasswordFormErrors = {};
    if (!currentPassword)
      errors.currentPassword = "Current password is required";
    if (!newPassword) errors.newPassword = "New password is required";
    else if (newPassword.length < 8)
      errors.newPassword = "Password must be at least 8 characters";
    if (!confirmPassword)
      errors.confirmPassword = "Please confirm your new password";
    else if (newPassword && newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setIsSavingPassword(true);
    try {
      await user?.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: false,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      setSnackbarMessage("Password changed successfully.");
    } catch (err) {
      setSnackbarMessage(extractClerkError(err));
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      {user && (
        <div className="flex items-center gap-4">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold"
              style={{
                background: "var(--md-sys-color-primary-container)",
                color: "var(--md-sys-color-on-primary-container)",
              }}
            >
              {(
                user.firstName?.[0] ??
                user.primaryEmailAddress?.emailAddress?.[0] ??
                ""
              ).toUpperCase()}
              {(user.lastName?.[0] ?? "").toUpperCase()}
            </div>
          )}
          <div>
            <p
              className="font-medium"
              style={{ color: "var(--md-sys-color-on-surface)" }}
            >
              {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
                "\u2014"}
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      )}

      <section>
        <h3
          className="text-title-medium mb-4"
          style={{ color: "var(--md-sys-color-on-surface)" }}
        >
          Profile Information
        </h3>
        <div className="flex flex-col gap-4">
          <Input
            label="Email"
            value={user?.primaryEmailAddress?.emailAddress ?? ""}
            isReadOnly
            description="Email changes require verification — contact support."
          />
          <Input
            label="First name"
            value={firstName}
            onValueChange={(v) => {
              setFirstName(v);
              setProfileErrors({});
            }}
            isInvalid={!!profileErrors.firstName}
            errorMessage={profileErrors.firstName}
            isDisabled={isSavingProfile}
          />
          <Input
            label="Last name"
            value={lastName}
            onValueChange={(v) => {
              setLastName(v);
              setProfileErrors({});
            }}
            isDisabled={isSavingProfile}
          />
          <div className="flex justify-end">
            <Button
              color="primary"
              onPress={handleSaveProfile}
              isLoading={isSavingProfile}
              spinner={<M3Spinner size="sm" color="currentColor" />}
            >
              Save Profile
            </Button>
          </div>
        </div>
      </section>

      <section>
        <h3
          className="text-title-medium mb-4"
          style={{ color: "var(--md-sys-color-on-surface)" }}
        >
          Change Password
        </h3>
        <div className="flex flex-col gap-4">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onValueChange={(v) => {
              setCurrentPassword(v);
              setPasswordErrors({});
            }}
            isInvalid={!!passwordErrors.currentPassword}
            errorMessage={passwordErrors.currentPassword}
            isDisabled={isSavingPassword}
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onValueChange={(v) => {
              setNewPassword(v);
              setPasswordErrors({});
            }}
            isInvalid={!!passwordErrors.newPassword}
            errorMessage={passwordErrors.newPassword}
            isDisabled={isSavingPassword}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onValueChange={(v) => {
              setConfirmPassword(v);
              setPasswordErrors({});
            }}
            isInvalid={!!passwordErrors.confirmPassword}
            errorMessage={passwordErrors.confirmPassword}
            isDisabled={isSavingPassword}
          />
          <div className="flex justify-end">
            <Button
              color="primary"
              onPress={handleChangePassword}
              isLoading={isSavingPassword}
              spinner={<M3Spinner size="sm" color="currentColor" />}
            >
              Change Password
            </Button>
          </div>
        </div>
      </section>

      <M3Snackbar
        message={snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
}
