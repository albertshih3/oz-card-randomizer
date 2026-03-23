import { useState, useCallback, useMemo } from "react";

const STORAGE_KEYS = {
  selectedCategory: "oz-admin.selectedCategory",
  viewMode: "oz-admin.viewMode",
  searchQuery: "oz-admin.searchQuery",
  statusFilter: "oz-admin.statusFilter",
} as const;

export type ViewMode = "table" | "grid" | "list";
export type StatusFilter = "all" | "active" | "inactive";

export interface AdminFilters {
  selectedCategory: string;
  viewMode: ViewMode;
  searchQuery: string;
  statusFilter: StatusFilter;
}

function readStorage(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? raw : fallback;
  } catch {
    return fallback;
  }
}

function readValidatedViewMode(): ViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.viewMode);
    if (raw === "table" || raw === "grid" || raw === "list") return raw;
  } catch {
    /* ignore */
  }
  return "table";
}

function readValidatedStatusFilter(): StatusFilter {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.statusFilter);
    if (raw === "all" || raw === "active" || raw === "inactive") return raw;
  } catch {
    /* ignore */
  }
  return "all";
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently ignore storage errors (e.g. quota exceeded, private mode)
  }
}

export function useAdminFilters() {
  const [selectedCategory, setSelectedCategoryState] = useState<string>(() =>
    readStorage(STORAGE_KEYS.selectedCategory, "all"),
  );
  const [viewMode, setViewModeState] = useState<ViewMode>(
    readValidatedViewMode,
  );
  const [searchQuery, setSearchQueryState] = useState<string>(() =>
    readStorage(STORAGE_KEYS.searchQuery, ""),
  );
  const [statusFilter, setStatusFilterState] = useState<StatusFilter>(
    readValidatedStatusFilter,
  );
  const [categoryRefreshKey, setCategoryRefreshKeyState] = useState(0);

  const setSelectedCategory = useCallback((value: string) => {
    setSelectedCategoryState(value);
    writeStorage(STORAGE_KEYS.selectedCategory, value);
  }, []);

  const setViewMode = useCallback((value: ViewMode) => {
    setViewModeState(value);
    writeStorage(STORAGE_KEYS.viewMode, value);
  }, []);

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value);
    writeStorage(STORAGE_KEYS.searchQuery, value);
  }, []);

  const setStatusFilter = useCallback((value: StatusFilter) => {
    setStatusFilterState(value);
    writeStorage(STORAGE_KEYS.statusFilter, value);
  }, []);

  const bumpCategoryRefreshKey = useCallback(() => {
    setCategoryRefreshKeyState((k) => k + 1);
  }, []);

  return useMemo(
    () => ({
      filters: { selectedCategory, viewMode, searchQuery, statusFilter },
      setSelectedCategory,
      setViewMode,
      setSearchQuery,
      setStatusFilter,
      categoryRefreshKey,
      bumpCategoryRefreshKey,
    }),
    [
      selectedCategory,
      viewMode,
      searchQuery,
      statusFilter,
      setSelectedCategory,
      setViewMode,
      setSearchQuery,
      setStatusFilter,
      categoryRefreshKey,
      bumpCategoryRefreshKey,
    ],
  );
}
