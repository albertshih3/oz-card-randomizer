import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";

const mockGeneratePacks = vi.fn();
let mockBoosterPacks: Array<
  Array<{ id: string; name: string; number: string; collection: string }>
> = [];

vi.mock("@/layouts/default", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}));

vi.mock("@/hooks/use-booster-pack-generation", () => ({
  useBoosterPackGeneration: () => ({
    boosterPacks: mockBoosterPacks,
    packHistory: [],
    lastGenTime: null,
    generatePacks: mockGeneratePacks,
  }),
}));

vi.mock("@/hooks/use-excel-export", () => ({
  useExcelExport: () => ({
    exportToExcel: vi.fn(),
    isExporting: false,
  }),
}));

vi.mock("@/utils/categories", () => ({
  getCategories: vi.fn().mockResolvedValue([]),
  categoriesToLegacyFormat: vi.fn().mockReturnValue([]),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/gtag", () => ({ event: vi.fn(), exception: vi.fn() }));

import IndexPage from "@/pages/index";

describe("IndexPage", () => {
  beforeEach(() => {
    mockGeneratePacks.mockClear();
    mockBoosterPacks = [];
  });

  it("presents the generator as a staff-first mobile flow", async () => {
    render(<IndexPage />);

    await waitFor(() => {
      expect(screen.getByText("Generate a pack")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /generate pack/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/each pack should contain 10 cards/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Current Pack(s)")).not.toBeInTheDocument();
    expect(
      screen.queryByText("No packs generated yet"),
    ).not.toBeInTheDocument();
  });

  it("generates one pack from the primary staff action", async () => {
    render(<IndexPage />);

    const button = await screen.findByRole("button", {
      name: /generate pack/i,
    });

    fireEvent.click(button);

    expect(mockGeneratePacks).toHaveBeenCalledWith(1);
  });

  it("lets staff mark a generated card as completed", async () => {
    mockBoosterPacks = [
      [
        {
          id: "card-1",
          name: "African Elephant",
          number: "42",
          collection: "africansavanna",
        },
      ],
    ];

    render(<IndexPage />);

    const cardToggle = await screen.findByRole("checkbox", {
      name: /mark african elephant complete/i,
    });

    expect(cardToggle).not.toBeChecked();

    fireEvent.click(cardToggle);

    expect(cardToggle).toBeChecked();
    expect(screen.getByText("African Elephant")).toHaveClass("line-through");
    expect(screen.getByText("1 of 1 pulled")).toBeInTheDocument();
  });

  it("keeps generated card names readable with card number in a scan-friendly chip", async () => {
    const longCardName =
      "California Condor Recovery Program Behind-the-Scenes Habitat";
    mockBoosterPacks = [
      [
        {
          id: "card-1",
          name: longCardName,
          number: "42",
          collection: "catrail",
        },
      ],
    ];

    render(<IndexPage />);

    const cardName = await screen.findByText(longCardName);

    expect(cardName).not.toHaveClass("truncate");
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.queryByText("Card #42")).not.toBeInTheDocument();
  });

  it("stretches the pull number and card number chips to the generated row height", async () => {
    mockBoosterPacks = [
      [
        {
          id: "card-1",
          name: "California Condor Recovery Program Behind-the-Scenes Habitat",
          number: "42",
          collection: "catrail",
        },
      ],
    ];

    render(<IndexPage />);

    const cardToggle = await screen.findByRole("checkbox", {
      name: /mark california condor recovery program/i,
    });

    expect(within(cardToggle).getByText("1")).toHaveClass("self-stretch");
    expect(within(cardToggle).getByText("#42")).toHaveClass("self-stretch");
  });

  it("keeps generate another compact until every generated card is complete", async () => {
    mockBoosterPacks = [
      [
        {
          id: "card-1",
          name: "African Elephant",
          number: "42",
          collection: "africansavanna",
        },
        {
          id: "card-2",
          name: "American Alligator",
          number: "7",
          collection: "childrenszoo",
        },
      ],
    ];

    render(<IndexPage />);

    expect(
      await screen.findByRole("button", { name: /regenerate/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Regenerate")).toBeInTheDocument();
    expect(screen.queryByText("Generate another")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /mark african elephant complete/i,
      }),
    );

    expect(await screen.findByText("1 of 2 pulled")).toBeInTheDocument();
    expect(screen.queryByText("Generate another")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /mark american alligator complete/i,
      }),
    );

    expect(await screen.findByText("Generate another")).toBeInTheDocument();
  });

  it("celebrates when every card in the current pack has been pulled", async () => {
    mockBoosterPacks = [
      [
        {
          id: "card-1",
          name: "African Elephant",
          number: "42",
          collection: "africansavanna",
        },
      ],
    ];

    render(<IndexPage />);

    expect(screen.queryByText("Pack ready")).not.toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: /mark african elephant complete/i,
      }),
    );

    expect(await screen.findByText("Pack ready")).toBeInTheDocument();
    expect(
      screen.getByText("All cards are pulled and ready to hand off."),
    ).toBeInTheDocument();
  });
});
