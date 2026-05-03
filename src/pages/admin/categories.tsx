import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  getCategories,
  toggleWildcardEligible,
  clearCategoriesCache,
} from "@/utils/categories";
import type { Category } from "@/utils/categories";
import { useAdminFiltersContext } from "@/contexts/admin-filters-context";
import { LinearProgress } from "@/components/m3/linear-progress";
import { M3Snackbar } from "@/components/m3/snackbar";
import { CategoryEditSheet } from "@/components/admin/category-edit-sheet";
import { Switch } from "@heroui/switch";
import { Plus, Pencil, Tag } from "lucide-react";
import { event } from "@/lib/gtag";

export default function AdminCategoriesPage() {
  const { getToken } = useAuth();
  const { bumpCategoryRefreshKey } = useAdminFiltersContext();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");

  const fetchCategories = useCallback(async () => {
    setIsPending(true);
    setLoadError(null);
    try {
      clearCategoriesCache();
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load categories",
      );
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleToggleWildcard = async (cat: Category) => {
    const newValue = !cat.isWildcardEligible;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id ? { ...c, isWildcardEligible: newValue } : c,
      ),
    );
    try {
      await toggleWildcardEligible(cat.id, newValue, getToken);
      event("category_wildcard_toggled", {
        category_id: cat.id,
        wildcard_eligible: newValue,
      });
      bumpCategoryRefreshKey();
    } catch (err) {
      console.error(err);
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id
            ? { ...c, isWildcardEligible: cat.isWildcardEligible }
            : c,
        ),
      );
      setSnackbarMessage("Failed to update wildcard eligibility.");
    }
  };

  const handleSaved = useCallback(() => {
    fetchCategories();
    bumpCategoryRefreshKey();
  }, [fetchCategories, bumpCategoryRefreshKey]);

  const openCreateSheet = () => {
    setEditTarget(null);
    setEditMode("create");
    setEditSheetOpen(true);
  };

  const openEditSheet = (cat: Category) => {
    setEditTarget(cat);
    setEditMode("edit");
    setEditSheetOpen(true);
  };

  return (
    <div>
      <LinearProgress visible={isPending} className="mb-3" />

      <div
        className="flex items-center justify-between mb-3"
        style={{ minHeight: "2rem" }}
      >
        <p
          className="text-label-medium uppercase tracking-widest"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          Categories
          {!isPending && categories.length > 0 && ` · ${categories.length}`}
        </p>
        <button
          onClick={openCreateSheet}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl text-label-large transition-opacity hover:opacity-80"
          style={{
            background: "var(--md-sys-color-primary-container)",
            color: "var(--md-sys-color-on-primary-container)",
          }}
        >
          <Plus size={15} />
          Add Category
        </button>
      </div>

      {loadError && !isPending && (
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{
            background: "var(--md-sys-color-error-container)",
            color: "var(--md-sys-color-on-error-container)",
          }}
        >
          <p className="text-body-medium">{loadError}</p>
          <button
            onClick={fetchCategories}
            className="text-label-large hover:opacity-80 transition-opacity ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {!loadError && !isPending && categories.length === 0 && (
        <p
          className="text-body-medium py-6 text-center"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          No categories yet.
        </p>
      )}

      {categories.length > 0 && (
        <div
          data-tutorial-id="categories-table"
          className="rounded-3xl border overflow-hidden"
          style={{
            background: "var(--md-sys-color-surface)",
            borderColor: "var(--md-sys-color-outline-variant)",
          }}
        >
          {/* Header row */}
          <div
            className="hidden lg:grid grid-cols-[1fr_180px_120px_48px] gap-4 px-5 py-2.5 border-b"
            style={{
              borderColor: "var(--md-sys-color-outline-variant)",
              background: "var(--md-sys-color-surface-variant)",
            }}
          >
            <span
              className="text-label-medium"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              Display Name
            </span>
            <span
              className="text-label-medium"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              Category ID
            </span>
            <span
              className="text-label-medium"
              style={{ color: "var(--md-sys-color-on-surface-variant)" }}
            >
              Wildcard
            </span>
            <span />
          </div>

          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className="flex lg:grid lg:grid-cols-[1fr_180px_120px_48px] items-center gap-4 px-5 py-4"
              style={
                i < categories.length - 1
                  ? {
                      borderBottom:
                        "1px solid var(--md-sys-color-outline-variant)",
                    }
                  : undefined
              }
            >
              {/* Display name */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-body-medium truncate"
                  style={{
                    background: "var(--md-sys-color-primary-container)",
                    color: "var(--md-sys-color-on-primary-container)",
                  }}
                >
                  <Tag size={12} className="shrink-0" />
                  {cat.displayName}
                </span>
              </div>

              {/* Category ID */}
              <div className="hidden lg:block">
                <code
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-body-medium font-mono"
                  style={{
                    background: "var(--md-sys-color-surface-variant)",
                    color: "var(--md-sys-color-on-surface-variant)",
                  }}
                >
                  {cat.name}
                </code>
              </div>

              {/* Wildcard toggle */}
              <div className="shrink-0">
                <Switch
                  {...(i === 0
                    ? { "data-tutorial-id": "wildcard-toggle" }
                    : {})}
                  isSelected={cat.isWildcardEligible ?? false}
                  onValueChange={() => handleToggleWildcard(cat)}
                  size="sm"
                />
              </div>

              {/* Edit button */}
              <div className="shrink-0 flex justify-end">
                <button
                  onClick={() => openEditSheet(cat)}
                  aria-label={`Edit ${cat.displayName}`}
                  className="p-2 rounded-xl transition-opacity hover:opacity-70"
                  style={{ color: "var(--md-sys-color-primary)" }}
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={openCreateSheet}
        className="fixed bottom-6 right-6 z-20 lg:hidden w-14 h-14 rounded-2xl flex items-center justify-center shadow-elevation-3"
        style={{
          background: "var(--md-sys-color-primary-container)",
          color: "var(--md-sys-color-on-primary-container)",
        }}
        aria-label="Add category"
      >
        <Plus size={24} />
      </button>

      <CategoryEditSheet
        mode={editMode}
        category={editTarget ?? undefined}
        isOpen={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSaved={handleSaved}
        onError={setSnackbarMessage}
      />

      <M3Snackbar
        message={snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
}
