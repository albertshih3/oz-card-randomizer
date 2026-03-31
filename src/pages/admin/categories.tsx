import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { listContainerVariants } from "@/lib/motion";
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
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Switch } from "@heroui/switch";
import { Button } from "@heroui/button";
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
    // Optimistic update
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
      // Revert optimistic update
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
    <div style={{ color: "var(--md-sys-color-on-surface)" }}>
      <LinearProgress visible={isPending} className="mb-3" />

      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-headline-large">Categories</h1>
          <p
            className="text-body-medium"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Button
          color="primary"
          className="hidden lg:flex"
          onPress={openCreateSheet}
          startContent={<Plus size={16} />}
        >
          Add Category
        </Button>
      </div>

      {loadError && !isPending && (
        <div className="text-center py-12">
          <p
            className="font-medium mb-1"
            style={{ color: "var(--md-sys-color-error)" }}
          >
            Could not load categories
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--md-sys-color-on-surface-variant)" }}
          >
            {loadError}
          </p>
          <Button size="sm" variant="flat" onPress={fetchCategories}>
            Retry
          </Button>
        </div>
      )}

      {!loadError && (
        <>
          {categories.length === 0 && !isPending && (
            <div className="text-center py-12">
              <p
                className="text-body-medium mb-4"
                style={{ color: "var(--md-sys-color-on-surface-variant)" }}
              >
                No categories found.
              </p>
              <Button
                color="primary"
                onPress={openCreateSheet}
                startContent={<Plus size={16} />}
              >
                Add Category
              </Button>
            </div>
          )}
          {categories.length > 0 && (
            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              className="overflow-x-auto rounded-2xl"
              style={{
                border: "1px solid var(--md-sys-color-outline-variant)",
              }}
            >
              <Table aria-label="Categories" removeWrapper>
                <TableHeader>
                  <TableColumn>
                    <span className="text-label-large">Display Name</span>
                  </TableColumn>
                  <TableColumn>
                    <span className="text-label-large">Category ID</span>
                  </TableColumn>
                  <TableColumn>
                    <span className="text-label-large">Wildcard Eligible</span>
                  </TableColumn>
                  <TableColumn>
                    <span className="text-label-large">Actions</span>
                  </TableColumn>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-body-medium"
                          style={{
                            background: "var(--md-sys-color-primary-container)",
                            color: "var(--md-sys-color-on-primary-container)",
                          }}
                        >
                          <Tag size={12} />
                          {cat.displayName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-mono"
                          style={{
                            background: "var(--md-sys-color-surface-variant)",
                            color: "var(--md-sys-color-on-surface-variant)",
                          }}
                        >
                          {cat.name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Switch
                          isSelected={cat.isWildcardEligible ?? false}
                          onValueChange={() => handleToggleWildcard(cat)}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => openEditSheet(cat)}
                          aria-label={`Edit ${cat.displayName}`}
                          className="p-1 rounded-lg"
                          style={{ color: "var(--md-sys-color-primary)" }}
                        >
                          <Pencil size={16} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </>
      )}

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
