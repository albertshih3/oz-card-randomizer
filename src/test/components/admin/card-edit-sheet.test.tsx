import React from "react";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: "new-id" }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn().mockReturnValue({}),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock("firebase/auth", () => ({
  signInWithCustomToken: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/firebase", () => ({ db: {}, auth: { currentUser: {} } }));
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("fake-token") }),
}));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & { [key: string]: unknown }) => (
      <div {...filterDomProps(rest)}>{children}</div>
    ),
    button: ({
      children,
      ...rest
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      [key: string]: unknown;
    }) => <button {...filterDomProps(rest)}>{children}</button>,
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
  ModalFooter: ({ children }: { children: React.ReactNode }) => (
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
    value,
    onValueChange,
    label,
    isInvalid,
    errorMessage,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    label?: string;
    isInvalid?: boolean;
    errorMessage?: string;
  }) => (
    <div>
      <input
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        aria-invalid={isInvalid}
      />
      {isInvalid && errorMessage && <span>{errorMessage}</span>}
    </div>
  ),
}));
vi.mock("@heroui/select", () => ({
  Select: ({
    onSelectionChange,
    label,
  }: {
    children: React.ReactNode;
    onSelectionChange?: (keys: Set<string>) => void;
    label?: string;
  }) => (
    <input
      aria-label={label}
      data-testid={`select-${label}`}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onSelectionChange?.(new Set([e.target.value]))
      }
    />
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@heroui/switch", () => ({
  Switch: ({
    isSelected,
    onValueChange,
    children,
  }: {
    isSelected?: boolean;
    onValueChange?: (v: boolean) => void;
    children?: React.ReactNode;
  }) => (
    <label>
      <input
        type="checkbox"
        checked={isSelected ?? false}
        onChange={(e) => onValueChange?.(e.target.checked)}
      />
      {children}
    </label>
  ),
}));
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false, // desktop mode
}));
vi.mock("@/lib/gtag", () => ({ event: vi.fn() }));

// Helper to filter non-DOM props from motion mock
function filterDomProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const nonDom = new Set([
    "initial",
    "animate",
    "exit",
    "transition",
    "drag",
    "dragConstraints",
    "dragElastic",
    "onDragEnd",
    "variants",
    "custom",
    "whileHover",
    "whileTap",
    "layout",
    "layoutId",
  ]);
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!nonDom.has(k)) filtered[k] = v;
  }
  return filtered;
}

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CardEditSheet } from "@/components/admin/card-edit-sheet";
import { addDoc, deleteDoc } from "firebase/firestore";

const testCategories = [
  {
    id: "africansavanna",
    name: "africansavanna",
    displayName: "African Savannah",
    isWildcardEligible: false,
  },
  {
    id: "childrenszoo",
    name: "childrenszoo",
    displayName: "Children's Zoo",
    isWildcardEligible: false,
  },
];

const testCard = {
  id: "card-1",
  name: "Lion",
  number: "1",
  collection: "africansavanna",
  active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CardEditSheet — OAK-55", () => {
  it("shows validation errors when saving with empty fields", async () => {
    render(
      <CardEditSheet
        mode="create"
        categories={testCategories}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText(/Card name is required/i)).toBeInTheDocument();
    });
  });

  it("calls addDoc with correct payload on create (no collection field)", async () => {
    render(
      <CardEditSheet
        mode="create"
        categories={testCategories}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    const nameInput = screen.getByRole("textbox", { name: /card name/i });
    const numberInput = screen.getByRole("textbox", { name: /card number/i });
    const collectionSelect = screen.getByRole("textbox", {
      name: /collection/i,
    });

    fireEvent.change(nameInput, { target: { value: "Test Card" } });
    fireEvent.change(numberInput, { target: { value: "42" } });
    fireEvent.change(collectionSelect, {
      target: { value: "africansavanna" },
    });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(1);
    });
    const [, payload] = (addDoc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload).not.toHaveProperty("collection");
    expect(payload).toMatchObject({
      name: "Test Card",
      number: "42",
      active: true,
    });
  });

  it("calls onSaved after successful create", async () => {
    const onSaved = vi.fn();
    render(
      <CardEditSheet
        mode="create"
        categories={testCategories}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={onSaved}
        onError={vi.fn()}
      />,
    );
    const nameInput = screen.getByRole("textbox", { name: /card name/i });
    const numberInput = screen.getByRole("textbox", { name: /card number/i });
    const collectionSelect = screen.getByRole("textbox", {
      name: /collection/i,
    });

    fireEvent.change(nameInput, { target: { value: "Test Card" } });
    fireEvent.change(numberInput, { target: { value: "42" } });
    fireEvent.change(collectionSelect, {
      target: { value: "africansavanna" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });

  it("calls deleteDoc on delete confirmation", async () => {
    render(
      <CardEditSheet
        mode="edit"
        card={testCard}
        categories={testCategories}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    const deleteButton = screen.getByRole("button", { name: /^delete$/i });
    fireEvent.click(deleteButton);

    const confirmButton = await screen.findByRole("button", {
      name: /permanently/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  it("clears name error when name field is changed", async () => {
    render(
      <CardEditSheet
        mode="create"
        categories={testCategories}
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    // Trigger validation error
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/Card name is required/i)).toBeInTheDocument();
    });
    // Fix the error by typing
    const nameInput = screen.getByRole("textbox", { name: /card name/i });
    fireEvent.change(nameInput, { target: { value: "A" } });
    await waitFor(() => {
      expect(
        screen.queryByText(/Card name is required/i),
      ).not.toBeInTheDocument();
    });
  });
});
