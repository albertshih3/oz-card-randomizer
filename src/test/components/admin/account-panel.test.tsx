import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockUpdate: ReturnType<typeof vi.fn>;
let mockUpdatePassword: ReturnType<typeof vi.fn>;
let mockUser: {
  update: ReturnType<typeof vi.fn>;
  updatePassword: ReturnType<typeof vi.fn>;
  imageUrl: string;
  firstName: string;
  lastName: string;
  primaryEmailAddress: { emailAddress: string };
} | null;

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: mockUser, isLoaded: true }),
}));

vi.mock("@heroui/button", () => ({
  Button: ({
    children,
    onPress,
    isLoading,
    isDisabled,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    isLoading?: boolean;
    isDisabled?: boolean;
  }) => (
    <button onClick={onPress} disabled={isDisabled || isLoading}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

vi.mock("@heroui/input", () => ({
  Input: ({
    label,
    value,
    onValueChange,
    isInvalid,
    errorMessage,
    isDisabled,
    type,
    isReadOnly,
    description,
  }: {
    label: string;
    value?: string;
    onValueChange?: (v: string) => void;
    isInvalid?: boolean;
    errorMessage?: string;
    isDisabled?: boolean;
    type?: string;
    isReadOnly?: boolean;
    description?: string;
  }) => (
    <div>
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        aria-invalid={isInvalid}
        disabled={isDisabled || isReadOnly}
        type={type ?? "text"}
        readOnly={isReadOnly}
      />
      {description && <p>{description}</p>}
      {isInvalid && errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  ),
}));

vi.mock("@/components/m3/snackbar", () => ({
  M3Snackbar: ({ message }: { message: string | null }) =>
    message ? <div role="status">{message}</div> : null,
}));

import { AccountPanel } from "@/components/admin/account-panel";

beforeEach(() => {
  mockUpdate = vi.fn().mockResolvedValue(undefined);
  mockUpdatePassword = vi.fn().mockResolvedValue(undefined);
  mockUser = {
    update: mockUpdate,
    updatePassword: mockUpdatePassword,
    imageUrl: "https://example.com/avatar.jpg",
    firstName: "Test",
    lastName: "User",
    primaryEmailAddress: { emailAddress: "test@zoo.org" },
  };
  vi.clearAllMocks();
});

describe("AccountPanel — OAK-81", () => {
  it("renders user email as read-only", () => {
    render(<AccountPanel />);
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.value).toBe("test@zoo.org");
    expect(emailInput.readOnly || emailInput.disabled).toBe(true);
  });

  it("saves profile with correct name via user.update", async () => {
    render(<AccountPanel />);
    const firstNameInput = screen.getByLabelText("First name");
    fireEvent.change(firstNameInput, { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: "Updated" }),
      ),
    );
  });

  it("shows validation error when first name is empty", async () => {
    render(<AccountPanel />);
    const firstNameInput = screen.getByLabelText("First name");
    fireEvent.change(firstNameInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "First name is required",
      ),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("shows validation error when passwords do not match", async () => {
    render(<AccountPanel />);
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Passwords do not match",
      ),
    );
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("shows snackbar with error message when password change fails", async () => {
    mockUpdatePassword.mockRejectedValueOnce(
      new Error("Incorrect current password"),
    );
    render(<AccountPanel />);
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "wrongpass" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "newpass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Incorrect current password",
      ),
    );
  });

  it("shows success snackbar and clears fields after password change", async () => {
    render(<AccountPanel />);
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "oldpass123" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "newpass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Password changed successfully.",
      ),
    );
    expect(
      (screen.getByLabelText("New password") as HTMLInputElement).value,
    ).toBe("");
  });
});
