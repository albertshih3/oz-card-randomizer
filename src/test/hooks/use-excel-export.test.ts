import { act, renderHook } from "@testing-library/react";
import { useExcelExport } from "@/hooks/use-excel-export";
import { drawPack } from "@/utils/pack-generation";

const { writeFile, event } = vi.hoisted(() => ({
  writeFile: vi.fn(),
  event: vi.fn(),
}));

vi.mock("xlsx", () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile,
}));
vi.mock("@/lib/gtag", () => ({ event }));

const packs = [drawPack({}, [])];

describe("useExcelExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports the download only after the workbook is written", async () => {
    const { result } = renderHook(() => useExcelExport());
    await act(() => result.current.exportToExcel(packs));
    expect(writeFile).toHaveBeenCalled();
    expect(event).toHaveBeenCalledWith(
      "download",
      expect.objectContaining({ pack_count: 1 }),
    );
    expect(writeFile.mock.invocationCallOrder[0]).toBeLessThan(
      event.mock.invocationCallOrder[0],
    );
  });

  it("rejects on a write failure with no event and unlocks", async () => {
    writeFile.mockImplementationOnce(() => {
      throw new Error("disk");
    });
    const { result } = renderHook(() => useExcelExport());
    await act(async () => {
      await expect(result.current.exportToExcel(packs)).rejects.toThrow("disk");
    });
    expect(event).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });
});
