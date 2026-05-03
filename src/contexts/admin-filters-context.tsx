import { createContext, useContext, ReactNode } from "react";
import {
  useAdminFilters,
  AdminFilters,
  ViewMode,
  StatusFilter,
} from "@/hooks/use-admin-filters";

interface AdminFiltersContextValue {
  filters: AdminFilters;
  setSelectedCategory: (value: string) => void;
  setViewMode: (value: ViewMode) => void;
  setSearchQuery: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
  categoryRefreshKey: number;
  bumpCategoryRefreshKey: () => void;
}

const AdminFiltersContext = createContext<AdminFiltersContextValue | null>(
  null,
);

export function AdminFiltersProvider({ children }: { children: ReactNode }) {
  const filtersApi = useAdminFilters();
  return (
    <AdminFiltersContext.Provider value={filtersApi}>
      {children}
    </AdminFiltersContext.Provider>
  );
}

export function useAdminFiltersContext(): AdminFiltersContextValue {
  const ctx = useContext(AdminFiltersContext);
  if (!ctx) {
    throw new Error(
      "useAdminFiltersContext must be used within AdminFiltersProvider",
    );
  }
  return ctx;
}
