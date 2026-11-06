import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";

const { readCollections, updateDoc, filters } = vi.hoisted(() => ({
  readCollections: vi.fn(),
  updateDoc: vi.fn(),
  filters: { selectedCategory: "a" },
}));

vi.mock("@/utils/cards", () => ({ readCollections }));
vi.mock("@/utils/categories", () => ({
  getCategories: vi.fn().mockResolvedValue([]),
}));
vi.mock("firebase/firestore", () => ({ updateDoc, doc: vi.fn(() => ({})) }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/firebase-auth", () => ({
  ensureFirebaseAuth: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}));
vi.mock("@/components/admin/card-edit-sheet", () => ({
  CardEditSheet: () => null,
}));
vi.mock("@/contexts/admin-filters-context", () => ({
  useAdminFiltersContext: () => ({
    filters: {
      ...filters,
      viewMode: "list",
      searchQuery: "",
      statusFilter: "all",
    },
    setViewMode: vi.fn(),
    setSearchQuery: vi.fn(),
    setStatusFilter: vi.fn(),
  }),
}));

import { CardPanel } from "@/components/admin/card-panel";

const card = (name: string, active = true) => ({
  id: name,
  name,
  number: "1",
  collection: "a",
  active,
});
const result = (...cards: ReturnType<typeof card>[]) => ({
  byCollection: { a: cards },
  malformed: 0,
});

describe("CardPanel data races", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filters.selectedCategory = "a";
  });

  it("ignores a slow response for a category no longer selected", async () => {
    let resolveFirst = (_: unknown) => {};
    readCollections.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve)),
    );
    readCollections.mockResolvedValueOnce(result(card("Current")));

    const { rerender } = render(<CardPanel />);
    await waitFor(() => expect(readCollections).toHaveBeenCalledTimes(1));

    filters.selectedCategory = "b";
    rerender(<CardPanel />);
    expect(await screen.findByText("Current")).toBeInTheDocument();

    await act(async () => resolveFirst(result(card("Stale"))));
    expect(screen.queryByText("Stale")).not.toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("shows a retryable error rather than an empty catalog", async () => {
    readCollections.mockRejectedValueOnce(new Error("offline"));
    readCollections.mockResolvedValueOnce(result(card("Recovered")));
    render(<CardPanel />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load cards.",
    );
    expect(screen.queryByText("No cards yet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Recovered")).toBeInTheDocument();
  });

  it("distinguishes an empty catalog", async () => {
    readCollections.mockResolvedValueOnce(result());
    render(<CardPanel />);
    expect(await screen.findByText("No cards yet.")).toBeInTheDocument();
  });

  it("allows one write per card until it finishes", async () => {
    readCollections.mockResolvedValueOnce(result(card("Lion")));
    let finishWrite = () => {};
    updateDoc.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishWrite = resolve)),
    );
    render(<CardPanel />);

    const toggle = await screen.findByRole("switch", { name: "Lion active" });
    fireEvent.click(toggle);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    fireEvent.click(toggle);
    expect(updateDoc).toHaveBeenCalledTimes(1);

    await act(async () => finishWrite());
    expect(toggle).not.toBeChecked();
  });
});
