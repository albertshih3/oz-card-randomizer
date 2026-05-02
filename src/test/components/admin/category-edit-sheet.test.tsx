import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn().mockReturnValue({}),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn().mockReturnValue({}),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));
vi.mock("firebase/auth", () => ({
  signInWithCustomToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: {} } }));
vi.mock("@/lib/firebase-auth", () => ({
  ensureFirebaseAuth: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("fake-token") }),
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@heroui/modal", () => ({
  Modal: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
  ModalContent: ({
    children,
  }: {
    children: ((onClose: () => void) => React.ReactNode) | React.ReactNode;
  }) => (
    <div>{typeof children === "function" ? children(() => {}) : children}</div>
  ),
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
    startContent,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    isLoading?: boolean;
    startContent?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} disabled={isLoading}>
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
    isReadOnly,
    description,
  }: {
    label?: string;
    value?: string;
    onValueChange?: (v: string) => void;
    isInvalid?: boolean;
    errorMessage?: string;
    isReadOnly?: boolean;
    description?: string;
  }) => (
    <div>
      <label>{label}</label>
      <input
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        readOnly={isReadOnly}
        aria-invalid={isInvalid}
        aria-label={label}
      />
      {isInvalid && errorMessage && <span role="alert">{errorMessage}</span>}
      {description && <span>{description}</span>}
    </div>
  ),
}));
vi.mock("@/lib/gtag", () => ({ event: vi.fn() }));
vi.mock("@/components/m3/bottom-sheet", () => ({
  BottomSheet: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
}));

import { CategoryEditSheet } from "@/components/admin/category-edit-sheet";
import { setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { event } from "@/lib/gtag";

const testCategory = {
  id: "africansavanna",
  name: "africansavanna",
  displayName: "African Savannah",
  isWildcardEligible: false,
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  onError: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
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

describe("CategoryEditSheet — OAK-105", () => {
  it("shows validation error when Display Name is empty on create", async () => {
    render(<CategoryEditSheet {...defaultProps} mode="create" />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText("Display name is required.")).toBeInTheDocument(),
    );
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("shows validation error when Category ID is empty in create mode", async () => {
    render(<CategoryEditSheet {...defaultProps} mode="create" />);
    await userEvent.type(screen.getByLabelText("Display Name"), "Test Zoo");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText("Category ID is required.")).toBeInTheDocument(),
    );
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("createCategory called with correct args on valid create; onSaved and onClose called", async () => {
    render(<CategoryEditSheet {...defaultProps} mode="create" />);
    await userEvent.type(screen.getByLabelText("Display Name"), "Test Zoo");
    await userEvent.type(screen.getByLabelText("Category ID"), "testzoo");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(setDoc).toHaveBeenCalled());
    expect(event).toHaveBeenCalledWith("category_created", {
      category_id: "testzoo",
    });
    expect(defaultProps.onSaved).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("updateCategoryDisplayName called correctly on edit; category ID input is read-only", async () => {
    render(
      <CategoryEditSheet
        {...defaultProps}
        mode="edit"
        category={testCategory}
      />,
    );
    const categoryIdInput = screen.getByLabelText("Category ID");
    expect(categoryIdInput).toHaveAttribute("readOnly");
    const displayNameInput = screen.getByLabelText("Display Name");
    await userEvent.clear(displayNameInput);
    await userEvent.type(displayNameInput, "Updated Name");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
    expect(event).toHaveBeenCalledWith("category_updated", {
      category_id: "africansavanna",
    });
    expect(defaultProps.onSaved).toHaveBeenCalled();
  });

  it("delete confirmation appears on Delete press; deleteCategory called on Confirm; onSaved/onClose called", async () => {
    render(
      <CategoryEditSheet
        {...defaultProps}
        mode="edit"
        category={testCategory}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(
      screen.getByText(/delete this category permanently/i),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /delete permanently/i }),
    );
    await waitFor(() => expect(deleteDoc).toHaveBeenCalled());
    expect(event).toHaveBeenCalledWith("category_deleted", {
      category_id: "africansavanna",
    });
    expect(defaultProps.onSaved).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("category ID error clears when user types in the field", async () => {
    render(<CategoryEditSheet {...defaultProps} mode="create" />);
    // Trigger validation error
    await userEvent.type(screen.getByLabelText("Display Name"), "Test");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(screen.getByText("Category ID is required.")).toBeInTheDocument(),
    );
    // Type in Category ID — error should clear
    await userEvent.type(screen.getByLabelText("Category ID"), "test");
    await waitFor(() =>
      expect(
        screen.queryByText("Category ID is required."),
      ).not.toBeInTheDocument(),
    );
  });
});
