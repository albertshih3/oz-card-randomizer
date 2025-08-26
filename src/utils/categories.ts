import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Category {
    id: string;
    name: string;
    displayName: string;
}

// Cache categories to avoid repeated Firebase calls
let cachedCategories: Category[] | null = null;

export const getCategories = async (): Promise<Category[]> => {
    if (cachedCategories) {
        return cachedCategories;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        const categories: Category[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            categories.push({
                id: doc.id,
                name: data.name || doc.id,
                displayName: data.displayName || data.name || doc.id,
            });
        });

        // If no categories exist in Firebase, create and return the default ones
        if (categories.length === 0) {
            return await createDefaultCategories();
        }

        cachedCategories = categories;
        return categories;
    } catch (err) {
        console.error("Error fetching categories:", err);
        return getDefaultCategories();
    }
};

const createDefaultCategories = async (): Promise<Category[]> => {
    const defaultCategories = [
        { name: "africansavanna", displayName: "African Savannah" },
        { name: "californiatrail", displayName: "California Trail" },
        { name: "childrenszoo", displayName: "Children's Zoo" },
        { name: "tropicalrainforest", displayName: "Tropical Rainforest" },
        { name: "specialedition", displayName: "Special Edition" },
        { name: "booatthezoo", displayName: "Boo at the Zoo" },
        { name: "arcas", displayName: "ARCAS" },
        { name: "newnaturefoundation", displayName: "New Nature Foundation" },
        { name: "disney", displayName: "Disney" },
    ];

    try {
        const newCategories: Category[] = [];
        for (const category of defaultCategories) {
            const docRef = await addDoc(collection(db, "categories"), {
                name: category.name,
                displayName: category.displayName,
            });
            newCategories.push({
                id: docRef.id,
                name: category.name,
                displayName: category.displayName,
            });
        }
        cachedCategories = newCategories;
        return newCategories;
    } catch (err) {
        console.error("Error creating default categories:", err);
        return getDefaultCategories();
    }
};

export const getDefaultCategories = (): Category[] => {
    return [
        { id: "africansavanna", name: "africansavanna", displayName: "African Savannah" },
        { id: "californiatrail", name: "californiatrail", displayName: "California Trail" },
        { id: "childrenszoo", name: "childrenszoo", displayName: "Children's Zoo" },
        { id: "tropicalrainforest", name: "tropicalrainforest", displayName: "Tropical Rainforest" },
        { id: "specialedition", name: "specialedition", displayName: "Special Edition" },
        { id: "booatthezoo", name: "booatthezoo", displayName: "Boo at the Zoo" },
        { id: "arcas", name: "arcas", displayName: "ARCAS" },
        { id: "newnaturefoundation", name: "newnaturefoundation", displayName: "New Nature Foundation" },
        { id: "disney", name: "disney", displayName: "Disney" },
    ];
};

// Clear cache when categories are updated
export const clearCategoriesCache = (): void => {
    cachedCategories = null;
};

// Convert categories to the legacy format for compatibility
export const categoriesToLegacyFormat = (categories: Category[]) => {
    return categories.map(cat => ({
        id: cat.name,
        name: cat.displayName
    }));
};