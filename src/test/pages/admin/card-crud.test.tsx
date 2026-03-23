import React from "react";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: "new-id" }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
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
  },
}));
vi.mock("@heroui/modal", () => ({
  Modal: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
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
  useMediaQuery: () => false,
}));
vi.mock("@/lib/gtag", () => ({ event: vi.fn() }));

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
import { addDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

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

describe("Card CRUD — OAK-57", () => {
  it("create card — addDoc called with name/number/active, no collection field", async () => {
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
    fireEvent.change(screen.getByRole("textbox", { name: /card name/i }), {
      target: { value: "Zebra" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /card number/i }), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /collection/i }), {
      target: { value: "africansavanna" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    const [, payload] = (addDoc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload).not.toHaveProperty("collection");
    expect(payload).toMatchObject({
      name: "Zebra",
      number: "99",
      active: true,
    });
  });

  it("update card — updateDoc called with correct payload", async () => {
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
    const nameInput = screen.getByRole("textbox", { name: /card name/i });
    fireEvent.change(nameInput, { target: { value: "Lion Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    const [, payload] = (updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload).not.toHaveProperty("collection");
    expect(payload).toMatchObject({
      name: "Lion Updated",
      number: "1",
      active: true,
    });
  });

  it("move card — writeBatch called when collection changes", async () => {
    const mockBatch = {
      set: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    (writeBatch as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);

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
    // Change collection
    fireEvent.change(screen.getByRole("textbox", { name: /collection/i }), {
      target: { value: "childrenszoo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(writeBatch).toHaveBeenCalledTimes(1));
    expect(mockBatch.set).toHaveBeenCalledTimes(1);
    expect(mockBatch.delete).toHaveBeenCalledTimes(1);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it("delete card — deleteDoc called after confirmation", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    const confirmButton = await screen.findByRole("button", {
      name: /permanently/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(deleteDoc).toHaveBeenCalledTimes(1));
  });
});
