import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockGetToken,
  mockGetCategories,
  mockToggleWildcard,
  mockBumpKey,
  mockOnSaved,
} = vi.hoisted(() => ({
  mockGetToken: vi.fn(),
  mockGetCategories: vi.fn(),
  mockToggleWildcard: vi.fn(),
  mockBumpKey: vi.fn(),
  mockOnSaved: vi.fn(),
}));

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));
vi.mock("@/utils/categories", () => ({
  getCategories: mockGetCategories,
  clearCategoriesCache: vi.fn(),
  toggleWildcardEligible: mockToggleWildcard,
}));
vi.mock("@/contexts/admin-filters-context", () => ({
  useAdminFiltersContext: () => ({ bumpCategoryRefreshKey: mockBumpKey }),
}));
vi.mock("@/components/admin/category-edit-sheet", () => ({
  CategoryEditSheet: ({
    isOpen,
    mode,
    onSaved,
  }: {
    isOpen: boolean;
    mode: string;
    onSaved: () => void;
  }) => {
    mockOnSaved.mockImplementation(onSaved);
    return isOpen ? (
      <div data-testid="category-edit-sheet" data-mode={mode} />
    ) : null;
  },
}));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));
vi.mock("@heroui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
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
vi.mock("@heroui/switch", () => ({
  Switch: ({
    isSelected,
    onValueChange,
  }: {
    isSelected: boolean;
    onValueChange?: (v: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={isSelected ?? false}
      onChange={(e) => onValueChange?.(e.target.checked)}
    />
  ),
}));
vi.mock("@heroui/button", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    startContent?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/m3/linear-progress", () => ({
  LinearProgress: () => <div data-testid="linear-progress" />,
}));
vi.mock("@/components/m3/snackbar", () => ({
  M3Snackbar: ({ message }: { message: string | null }) =>
    message ? <div role="status">{message}</div> : null,
}));

import AdminCategoriesPage from "@/pages/admin/categories";

const sampleCategories = [
  {
    id: "africansavanna",
    name: "africansavanna",
    displayName: "African Savannah",
    isWildcardEligible: false,
  },
  {
    id: "disney",
    name: "disney",
    displayName: "Disney",
    isWildcardEligible: true,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue("fake-token");
  mockGetCategories.mockResolvedValue(sampleCategories);
  mockToggleWildcard.mockResolvedValue(undefined);
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

describe("AdminCategoriesPage — OAK-104", () => {
  it("renders category list after load", async () => {
    render(<AdminCategoriesPage />);
    await waitFor(() =>
      expect(screen.getByText("African Savannah")).toBeInTheDocument(),
    );
    expect(screen.getByText("Disney")).toBeInTheDocument();
    expect(screen.getByText("africansavanna")).toBeInTheDocument();
  });

  it("shows inline load error with Retry when getCategories rejects", async () => {
    mockGetCategories.mockRejectedValueOnce(new Error("Network error"));
    render(<AdminCategoriesPage />);
    await waitFor(() =>
      expect(screen.getByText("Could not load categories")).toBeInTheDocument(),
    );
    expect(screen.getByText("Network error")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryBtn);
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalledTimes(2));
  });

  it("opens CategoryEditSheet in create mode when Add Category button pressed", async () => {
    render(<AdminCategoriesPage />);
    await waitFor(() =>
      expect(screen.getByText("African Savannah")).toBeInTheDocument(),
    );
    const addBtns = screen.getAllByRole("button", { name: /add category/i });
    await userEvent.click(addBtns[0]);
    const sheet = screen.getByTestId("category-edit-sheet");
    expect(sheet).toBeInTheDocument();
    expect(sheet.getAttribute("data-mode")).toBe("create");
  });

  it("opens CategoryEditSheet in edit mode when Edit button pressed", async () => {
    render(<AdminCategoriesPage />);
    await waitFor(() =>
      expect(screen.getByText("African Savannah")).toBeInTheDocument(),
    );
    const editBtn = screen.getByRole("button", {
      name: /edit african savannah/i,
    });
    await userEvent.click(editBtn);
    const sheet = screen.getByTestId("category-edit-sheet");
    expect(sheet).toBeInTheDocument();
    expect(sheet.getAttribute("data-mode")).toBe("edit");
  });

  it("onSaved triggers re-fetch", async () => {
    render(<AdminCategoriesPage />);
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalledTimes(1));
    act(() => mockOnSaved());
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalledTimes(2));
  });
});
