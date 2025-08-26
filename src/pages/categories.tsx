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
import { Spinner } from "@heroui/spinner";
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
import { EditIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import Unauthorized from "@/components/unauthorized";
import { event } from "@/lib/gtag";
import { getCategories, clearCategoriesCache } from "@/utils/categories";
import { db, auth } from "@/lib/firebase";

interface Category {
    id: string;
    name: string;
    displayName: string;
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
        onOpen();
    };

    const handleCreate = () => {
        setEditingCategory(null);
        setNewCategoryName("");
        setNewCategoryId("");
        setIsCreating(true);
        onOpen();
    };

    const handleSave = async () => {
        if (!newCategoryName.trim() || !newCategoryId.trim()) return;

        try {
            if (isCreating) {
                event({
                    action: 'create',
                    category: 'category_management',
                    label: 'category_created'
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
                    action: 'update',
                    category: 'category_management',
                    label: 'category_updated'
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
                            : cat
                    )
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
        }
    };

    const handleDelete = async (category: Category) => {
        if (!confirm(`Are you sure you want to delete the category "${category.displayName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            event({
                action: 'delete',
                category: 'category_management',
                label: 'category_deleted'
            });

            await deleteDoc(doc(db, "categories", category.id));
            setCategories(categories.filter((cat) => cat.id !== category.id));
            
            // Clear cache so other pages get updated categories
            clearCategoriesCache();
        } catch (err) {
            console.error("Error deleting category:", err);
        }
    };

    if (!isLoaded) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (!userId) {
        return (
            <DefaultLayout>
                <div className="flex justify-center items-center h-screen">
                    <Unauthorized />
                </div>
            </DefaultLayout>
        );
    }

    return (
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
                <div className="flex justify-between items-center w-full max-w-4xl">
                    <h1 className="text-2xl font-bold">Manage Categories</h1>
                    <Button color="primary" onPress={handleCreate}>
                        Create New Category
                    </Button>
                </div>

                {loading ? (
                    <Spinner />
                ) : (
                    <div className="w-full max-w-4xl">
                        <Table aria-label="Categories table">
                            <TableHeader>
                                <TableColumn>Display Name</TableColumn>
                                <TableColumn>ID</TableColumn>
                                <TableColumn>Actions</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>{category.displayName}</TableCell>
                                        <TableCell>{category.name}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="bordered"
                                                    onPress={() => handleEdit(category)}
                                                >
                                                    <EditIcon /> Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="danger"
                                                    variant="bordered"
                                                    onPress={() => handleDelete(category)}
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
            </section>

            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalContent>
                    <ModalHeader>
                        {isCreating ? "Create New Category" : "Edit Category"}
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-4">
                            <Input
                                label="Display Name"
                                placeholder="e.g., African Savannah"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                            />
                            <Input
                                label="Category ID"
                                placeholder="e.g., africansavanna"
                                value={newCategoryId}
                                onChange={(e) => setNewCategoryId(e.target.value)}
                                description="Used internally - should be lowercase with no spaces"
                            />
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" onPress={onClose}>
                            Cancel
                        </Button>
                        <Button color="primary" onPress={handleSave}>
                            {isCreating ? "Create" : "Save Changes"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </DefaultLayout>
    );
}