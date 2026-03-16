import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { M3Spinner } from "@/components/m3/spinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Switch } from "@heroui/switch";
import { motion } from "framer-motion";
import { Edit2, Trash2, Plus, Tag, AlertCircle, Save, X } from "lucide-react";
import DefaultLayout from "@/layouts/default";
import Unauthorized from "@/components/unauthorized";
import { event } from "@/lib/gtag";
import { getCategories, clearCategoriesCache } from "@/utils/categories";
import { validateCategoryForm, CategoryFormErrors } from "@/utils/validation";
import { db, auth } from "@/lib/firebase";

interface Category {
  id: string;
  name: string;
  displayName: string;
  isWildcardEligible?: boolean;
}

export default function CategoriesPage() {
  const { isLoaded, userId, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({});

  useEffect(() => {
    if (!isLoaded || !userId) return;

    const fetchCategories = async () => {
      try {
        const token = await getToken({ template: "integration_firebase" });
        await signInWithCustomToken(auth, token || "");

        // Use the centralized utility to get categories
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [isLoaded, userId, getToken]);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.displayName);
    setNewCategoryId(category.name);
    setIsCreating(false);
    setFormErrors({});
    onOpen();
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryId("");
    setIsCreating(true);
    setFormErrors({});
    onOpen();
  };

  const handleSave = async () => {
    const errors = validateCategoryForm({
      displayName: newCategoryName,
      categoryId: newCategoryId,
    });
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setIsSaving(true);

    try {
      if (isCreating) {
        event({
          action: "create",
          category: "category_management",
          label: "category_created",
        });

        const docRef = await addDoc(collection(db, "categories"), {
          name: newCategoryId.toLowerCase().replace(/\s+/g, ""),
          displayName: newCategoryName,
        });

        const newCategory: Category = {
          id: docRef.id,
          name: newCategoryId.toLowerCase().replace(/\s+/g, ""),
          displayName: newCategoryName,
        };

        setCategories([...categories, newCategory]);
      } else if (editingCategory) {
        event({
          action: "update",
          category: "category_management",
          label: "category_updated",
        });

        const categoryRef = doc(db, "categories", editingCategory.id);
        await updateDoc(categoryRef, {
          name: newCategoryId.toLowerCase().replace(/\s+/g, ""),
          displayName: newCategoryName,
        });

        setCategories(
          categories.map((cat) =>
            cat.id === editingCategory.id
              ? {
                  ...cat,
                  name: newCategoryId.toLowerCase().replace(/\s+/g, ""),
                  displayName: newCategoryName,
                }
              : cat,
          ),
        );
      }

      // Clear cache so other pages get updated categories
      clearCategoriesCache();

      onClose();
      setNewCategoryName("");
      setNewCategoryId("");
      setEditingCategory(null);
    } catch (err) {
      console.error("Error saving category:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      !confirm(
        `Are you sure you want to delete the category "${category.displayName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      event({
        action: "delete",
        category: "category_management",
        label: "category_deleted",
      });

      await deleteDoc(doc(db, "categories", category.id));
      setCategories(categories.filter((cat) => cat.id !== category.id));

      // Clear cache so other pages get updated categories
      clearCategoriesCache();
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  const handleToggleWildcard = async (category: Category) => {
    try {
      const newValue = !category.isWildcardEligible;

      // Optimistic update
      setCategories(
        categories.map((cat) =>
          cat.id === category.id
            ? { ...cat, isWildcardEligible: newValue }
            : cat,
        ),
      );

      const categoryRef = doc(db, "categories", category.id);
      await updateDoc(categoryRef, {
        isWildcardEligible: newValue,
      });

      // Clear cache so other pages get updated categories
      clearCategoriesCache();
    } catch (err) {
      console.error("Error updating wildcard eligibility:", err);
      // Revert on error
      setCategories(
        categories.map((cat) =>
          cat.id === category.id
            ? { ...cat, isWildcardEligible: !category.isWildcardEligible }
            : cat,
        ),
      );
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <M3Spinner size="lg" />
      </div>
    );
  }

  if (!userId) {
    return (
      <DefaultLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Unauthorized />
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6 py-8 md:py-12 max-w-5xl mx-auto"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Manage Categories
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage card categories and collections.
            </p>
          </div>
          <Button
            color="primary"
            onPress={handleCreate}
            startContent={<Plus className="w-5 h-5" />}
            className="font-semibold shadow-md"
          >
            Create Category
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <M3Spinner size="lg" label="Loading categories..." />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <Table
              aria-label="Categories table"
              removeWrapper
              classNames={{
                th: "bg-muted/50 text-muted-foreground font-medium py-3",
                td: "py-3 border-b border-border/50 last:border-0",
              }}
            >
              <TableHeader>
                <TableColumn>DISPLAY NAME</TableColumn>
                <TableColumn>ID</TableColumn>
                <TableColumn>WILDCARD ELIGIBLE</TableColumn>
                <TableColumn align="end">ACTIONS</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No categories found">
                {categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                          <Tag className="w-4 h-4" />
                        </div>
                        <span className="font-medium">
                          {category.displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-mono">
                        {category.name}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          size="sm"
                          isSelected={category.isWildcardEligible}
                          onValueChange={() => handleToggleWildcard(category)}
                          color="success"
                        />
                        <span
                          className={`text-xs ${category.isWildcardEligible ? "text-success font-medium" : "text-muted-foreground"}`}
                        >
                          {category.isWildcardEligible ? "Yes" : "No"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          onPress={() => handleEdit(category)}
                          startContent={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          onPress={() => handleDelete(category)}
                          startContent={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.section>

      <Modal
        isOpen={isOpen}
        onClose={onClose}
        backdrop="blur"
        classNames={{
          base: "bg-card border border-border shadow-2xl",
          header: "border-b border-border",
          footer: "border-t border-border",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">
              {isCreating ? "Create New Category" : "Edit Category"}
            </h2>
            <p className="text-sm text-muted-foreground font-normal">
              {isCreating
                ? "Add a new category to organize cards."
                : "Update category details."}
            </p>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-4">
              <Input
                label="Display Name"
                placeholder="e.g., African Savannah"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (formErrors.displayName)
                    setFormErrors((prev) => ({
                      ...prev,
                      displayName: undefined,
                    }));
                }}
                variant="bordered"
                labelPlacement="outside"
                isRequired
                isInvalid={!!formErrors.displayName}
                errorMessage={formErrors.displayName}
              />
              <Input
                label="Category ID"
                placeholder="e.g., africansavanna"
                value={newCategoryId}
                onChange={(e) => {
                  setNewCategoryId(e.target.value);
                  if (formErrors.categoryId)
                    setFormErrors((prev) => ({
                      ...prev,
                      categoryId: undefined,
                    }));
                }}
                description="Used internally - should be lowercase with no spaces"
                variant="bordered"
                labelPlacement="outside"
                isRequired
                isReadOnly={!isCreating}
                isInvalid={!!formErrors.categoryId}
                errorMessage={formErrors.categoryId}
                startContent={
                  <span className="text-muted-foreground text-sm">#</span>
                }
              />
              {isCreating && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 text-primary text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>
                    Category ID cannot be changed once created. Choose
                    carefully.
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={onClose}
              startContent={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={isSaving}
              startContent={!isSaving && <Save className="w-4 h-4" />}
              className="font-semibold"
            >
              {isCreating ? "Create Category" : "Save Changes"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
}
