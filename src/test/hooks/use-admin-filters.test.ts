import { renderHook, act } from "@testing-library/react";
import { useAdminFilters } from "@/hooks/use-admin-filters";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("useAdminFilters", () => {
  it("returns default values when localStorage is empty", () => {
    const { result } = renderHook(() => useAdminFilters());
    expect(result.current.filters.selectedCategory).toBe("all");
    expect(result.current.filters.viewMode).toBe("table");
    expect(result.current.filters.searchQuery).toBe("");
    expect(result.current.filters.statusFilter).toBe("all");
  });

  it("reads selectedCategory from localStorage on mount", () => {
    localStorage.setItem("oz-admin.selectedCategory", "africansavanna");
    const { result } = renderHook(() => useAdminFilters());
    expect(result.current.filters.selectedCategory).toBe("africansavanna");
  });

  it("setSelectedCategory updates state and localStorage", () => {
    const { result } = renderHook(() => useAdminFilters());
    act(() => {
      result.current.setSelectedCategory("childrenszoo");
    });
    expect(result.current.filters.selectedCategory).toBe("childrenszoo");
    expect(localStorage.getItem("oz-admin.selectedCategory")).toBe(
      "childrenszoo",
    );
  });

  it("setViewMode updates state and localStorage", () => {
    const { result } = renderHook(() => useAdminFilters());
    act(() => {
      result.current.setViewMode("grid");
    });
    expect(result.current.filters.viewMode).toBe("grid");
    expect(localStorage.getItem("oz-admin.viewMode")).toBe("grid");
  });

  it("setSearchQuery updates state and localStorage", () => {
    const { result } = renderHook(() => useAdminFilters());
    act(() => {
      result.current.setSearchQuery("lion");
    });
    expect(result.current.filters.searchQuery).toBe("lion");
    expect(localStorage.getItem("oz-admin.searchQuery")).toBe("lion");
  });

  it("setStatusFilter updates state and localStorage", () => {
    const { result } = renderHook(() => useAdminFilters());
    act(() => {
      result.current.setStatusFilter("inactive");
    });
    expect(result.current.filters.statusFilter).toBe("inactive");
    expect(localStorage.getItem("oz-admin.statusFilter")).toBe("inactive");
  });

  it("reads viewMode from localStorage on mount", () => {
    localStorage.setItem("oz-admin.viewMode", "grid");
    const { result } = renderHook(() => useAdminFilters());
    expect(result.current.filters.viewMode).toBe("grid");
  });

  it("falls back to default when viewMode in localStorage is invalid", () => {
    localStorage.setItem("oz-admin.viewMode", "bogus");
    const { result } = renderHook(() => useAdminFilters());
    expect(result.current.filters.viewMode).toBe("table");
  });

  it("falls back to default when statusFilter in localStorage is invalid", () => {
    localStorage.setItem("oz-admin.statusFilter", "bogus");
    const { result } = renderHook(() => useAdminFilters());
    expect(result.current.filters.statusFilter).toBe("all");
  });

  it("exposes categoryRefreshKey and bumpCategoryRefreshKey", () => {
    const { result } = renderHook(() => useAdminFilters());
    expect(result.current.categoryRefreshKey).toBe(0);
    act(() => {
      result.current.bumpCategoryRefreshKey();
    });
    expect(result.current.categoryRefreshKey).toBe(1);
  });

  it("gracefully handles localStorage errors on write", () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      const { result } = renderHook(() => useAdminFilters());
      // Should not throw even though localStorage.setItem fails
      act(() => {
        result.current.setSelectedCategory("childrenszoo");
      });
      expect(result.current.filters.selectedCategory).toBe("childrenszoo");
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });
});
