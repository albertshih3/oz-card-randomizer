import React from "react";

const { mockGetToken, mockListUsers, mockInviteUser } = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
  mockListUsers: vi.fn(),
  mockInviteUser: vi.fn(),
}));
let mockIsMobile = false;

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
  useUser: () => ({ user: null, isLoaded: true }),
}));
vi.mock("@/components/admin/account-panel", () => ({
  AccountPanel: () => <div data-testid="account-panel" />,
}));
vi.mock("@/utils/admin-api", () => ({
  listUsers: mockListUsers,
  inviteUser: mockInviteUser,
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => mockIsMobile,
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children }: React.HTMLAttributes<HTMLDivElement>) => (
      <div>{children}</div>
    ),
    aside: ({ children }: React.HTMLAttributes<HTMLElement>) => (
      <aside>{children}</aside>
    ),
    button: ({
      children,
      whileTap: _wt,
      animate: _a,
      transition: _tr,
      initial: _i,
      ...rest
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      [key: string]: unknown;
    }) => <button {...rest}>{children}</button>,
  },
}));
vi.mock("@heroui/modal", () => ({
  Modal: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div data-testid="modal">{children}</div> : null),
  ModalContent: ({
    children,
  }: {
    children: (onClose: () => void) => React.ReactNode;
  }) => <>{children(() => {})}</>,
  ModalHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ModalBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@heroui/button", () => ({
  Button: ({
    children,
    onPress,
    isLoading,
    isDisabled,
    startContent,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    isLoading?: boolean;
    isDisabled?: boolean;
    startContent?: React.ReactNode;
  }) => (
    <button onClick={onPress} disabled={isDisabled} aria-busy={isLoading}>
      {startContent}
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
  }: {
    label: string;
    value: string;
    onValueChange?: (v: string) => void;
    isInvalid?: boolean;
    errorMessage?: string;
    isDisabled?: boolean;
  }) => (
    <div>
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        aria-invalid={isInvalid}
        disabled={isDisabled}
      />
      {isInvalid && errorMessage && <span role="alert">{errorMessage}</span>}
    </div>
  ),
}));
vi.mock("@heroui/table", () => ({
  Table: ({
    children,
  }: {
    children: React.ReactNode;
    "aria-label"?: string;
  }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>
      <tr>{children}</tr>
    </thead>
  ),
  TableColumn: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
  TableCell: ({ children }: { children: React.ReactNode }) => (
    <td>{children}</td>
  ),
}));
vi.mock("@/components/m3/linear-progress", () => ({
  LinearProgress: () => <div data-testid="linear-progress" />,
}));
vi.mock("@/components/m3/snackbar", () => ({
  M3Snackbar: ({ message }: { message: string | null }) =>
    message ? <div role="status">{message}</div> : null,
}));
vi.mock("@/lib/gtag", () => ({ event: vi.fn() }));
vi.mock("@/components/m3/bottom-sheet", () => ({
  BottomSheet: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div data-testid="bottom-sheet">{children}</div> : null),
}));

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminUsersPage from "@/pages/admin/users";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue("fake-token");
  mockListUsers.mockResolvedValue([]);
  mockInviteUser.mockResolvedValue(undefined);
  mockIsMobile = false;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe("AdminUsersPage — OAK-59", () => {
  it("renders user list from mocked listUsers", async () => {
    mockListUsers.mockResolvedValueOnce([
      {
        id: "u1",
        email: "test@zoo.org",
        firstName: "Test",
        lastName: "User",
        lastSignInAt: 1000000,
      },
    ]);
    render(<AdminUsersPage />);
    await waitFor(() =>
      expect(screen.getByText("test@zoo.org")).toBeInTheDocument(),
    );
  });

  it('"Invite User" button opens invite modal', async () => {
    render(<AdminUsersPage />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });

  it("submitting invite calls inviteUser with correct email", async () => {
    render(<AdminUsersPage />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new@zoo.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    await waitFor(() =>
      expect(mockInviteUser).toHaveBeenCalledWith("fake-token", "new@zoo.org"),
    );
  });

  it("success snackbar appears after successful invite", async () => {
    mockInviteUser.mockResolvedValueOnce(undefined);
    render(<AdminUsersPage />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new@zoo.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Invite sent to new@zoo.org",
      ),
    );

    const { event } = await import("@/lib/gtag");
    expect(vi.mocked(event)).toHaveBeenCalledWith("user_invited", {});
  });

  it("error message appears inside modal on failed invite", async () => {
    mockInviteUser.mockRejectedValueOnce(
      new Error("That email is already invited"),
    );
    render(<AdminUsersPage />);
    await waitFor(() => expect(mockListUsers).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "existing@zoo.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "That email is already invited",
      ),
    );
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });

  it("shows inline error with retry button when load fails", async () => {
    mockListUsers.mockRejectedValueOnce(new Error("Request failed (404)"));
    render(<AdminUsersPage />);
    await waitFor(() =>
      expect(screen.getByText("Request failed (404)")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
