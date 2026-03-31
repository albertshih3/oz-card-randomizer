import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { useAuth } from "@clerk/clerk-react";
import { BottomSheet } from "@/components/m3/bottom-sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { validateCategoryForm, normalizeCategoryId } from "@/utils/validation";
import type { CategoryFormErrors } from "@/utils/validation";
import {
  createCategory,
  updateCategoryDisplayName,
  deleteCategory,
} from "@/utils/categories";
import type { Category } from "@/utils/categories";
import { Trash2, Save, X, AlertCircle } from "lucide-react";
import { event } from "@/lib/gtag";

type EditMode = "create" | "edit";

interface CategoryEditSheetProps {
  mode: EditMode;
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

interface FormContentProps {
  formData: { displayName: string; categoryId: string };
  formErrors: CategoryFormErrors;
  isSaving: boolean;
  showDeleteConfirm: boolean;
  mode: EditMode;
  onDisplayNameChange: (v: string) => void;
  onCategoryIdChange: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onClose: () => void;
}

function FormContent({
  formData,
  formErrors,
  isSaving,
  showDeleteConfirm,
  mode,
  onDisplayNameChange,
  onCategoryIdChange,
  onSave,
  onDelete,
  onDeleteConfirm,
  onDeleteCancel,
  onClose,
}: FormContentProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        label="Display Name"
        value={formData.displayName}
        isInvalid={!!formErrors.displayName}
        errorMessage={formErrors.displayName}
        onValueChange={(v) => onDisplayNameChange(v)}
      />
      <Input
        label="Category ID"
        value={formData.categoryId}
        isReadOnly={mode === "edit"}
        isInvalid={!!formErrors.categoryId}
        errorMessage={formErrors.categoryId}
        description={
          mode === "edit" ? "Category ID cannot be changed" : undefined
        }
        onValueChange={(v) => onCategoryIdChange(v)}
      />
      {mode === "create" && (
        <span
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-label-medium"
          style={{
            background: "var(--md-sys-color-tertiary-container)",
            color: "var(--md-sys-color-on-tertiary-container)",
          }}
        >
          <AlertCircle size={14} />
          Category ID cannot be changed once created.
        </span>
      )}

      {mode === "edit" && showDeleteConfirm && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: "var(--md-sys-color-error-container, #ffdad6)",
          }}
        >
          <p
            className="text-label-large"
            style={{ color: "var(--md-sys-color-on-error-container)" }}
          >
            Delete this category permanently?
          </p>
          <p
            className="text-body-medium"
            style={{ color: "var(--md-sys-color-on-error-container)" }}
          >
            Warning: Deleting a category does not delete its cards. Cards in
            this category will become inaccessible until manually moved.
          </p>
          <div className="flex gap-2">
            <Button variant="flat" onPress={onDeleteCancel}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={onDeleteConfirm}
              isLoading={isSaving}
            >
              Delete permanently
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        {mode === "edit" && !showDeleteConfirm && (
          <Button
            variant="bordered"
            color="danger"
            onPress={onDelete}
            startContent={<Trash2 size={16} />}
          >
            Delete
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={onSave}
            isLoading={isSaving}
            startContent={<Save size={16} />}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CategoryEditSheet({
  mode,
  category,
  isOpen,
  onClose,
  onSaved,
  onError,
}: CategoryEditSheetProps) {
  const { getToken } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [formData, setFormData] = useState({
    displayName: "",
    categoryId: "",
  });
  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormErrors({});
      setShowDeleteConfirm(false);
      return;
    }
    if (mode === "create") {
      setFormData({ displayName: "", categoryId: "" });
    } else if (category) {
      setFormData({
        displayName: category.displayName,
        categoryId: category.name,
      });
    }
  }, [isOpen, mode, category]);

  const handleSave = async () => {
    const dataToValidate = {
      displayName: formData.displayName,
      categoryId: formData.categoryId,
    };
    const errors = validateCategoryForm(dataToValidate);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "create") {
        const normalizedId = normalizeCategoryId(formData.categoryId);
        await createCategory(
          formData.displayName.trim(),
          normalizedId,
          getToken,
        );
        event("category_created", { category_id: normalizedId });
      } else if (category) {
        await updateCategoryDisplayName(
          category.id,
          formData.displayName.trim(),
          getToken,
        );
        event("category_updated", { category_id: category.id });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      onError("Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    setIsSaving(true);
    try {
      await deleteCategory(category.id, getToken);
      event("category_deleted", { category_id: category.id });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      onError("Failed to delete category.");
    } finally {
      setIsSaving(false);
    }
  };

  const formContentProps: FormContentProps = {
    formData,
    formErrors,
    isSaving,
    showDeleteConfirm,
    mode,
    onDisplayNameChange: (v) => {
      setFormData((p) => ({ ...p, displayName: v }));
      setFormErrors((p) => ({ ...p, displayName: undefined }));
    },
    onCategoryIdChange: (v) => {
      setFormData((p) => ({ ...p, categoryId: v }));
      setFormErrors((p) => ({ ...p, categoryId: undefined }));
    },
    onSave: handleSave,
    onDelete: () => setShowDeleteConfirm(true),
    onDeleteConfirm: handleDelete,
    onDeleteCancel: () => setShowDeleteConfirm(false),
    onClose,
  };

  const title = mode === "create" ? "New Category" : "Edit Category";

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        aria-labelledby="cat-edit-title"
      >
        <div className="px-2 pb-6">
          <h2
            id="cat-edit-title"
            className="text-title-large px-4 pt-2 pb-2"
            style={{ color: "var(--md-sys-color-on-surface)" }}
          >
            {title}
          </h2>
          <FormContent {...formContentProps} />
        </div>
      </BottomSheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      aria-labelledby="cat-edit-title"
      classNames={{ base: "rounded-3xl", header: "border-b-0 pb-0" }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <h2
                id="cat-edit-title"
                className="text-title-large"
                style={{ color: "var(--md-sys-color-on-surface)" }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg"
                aria-label="Close"
                style={{ color: "var(--md-sys-color-on-surface-variant)" }}
              >
                <X size={20} />
              </button>
            </ModalHeader>
            <ModalBody className="pb-6">
              <FormContent {...formContentProps} />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
