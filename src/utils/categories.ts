import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Category {
    id: string;
    name: string;
    displayName: string;
    isWildcardEligible?: boolean;
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
        const seenNames = new Set<string>();

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const name = data.name || doc.id;

            // Deduplicate based on name
            if (!seenNames.has(name)) {
                seenNames.add(name);
                categories.push({
                    id: doc.id,
                    name: name,
                    displayName: data.displayName || data.name || doc.id,
                    isWildcardEligible: data.isWildcardEligible || false,
                });
            }
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
            // Use setDoc with the category name as ID to prevent duplicates
            await setDoc(doc(db, "categories", category.name), {
                name: category.name,
                displayName: category.displayName,
                isWildcardEligible: false,
            });

            newCategories.push({
                id: category.name,
                name: category.name,
                displayName: category.displayName,
                isWildcardEligible: false,
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
        { id: "africansavanna", name: "africansavanna", displayName: "African Savannah", isWildcardEligible: false },
        { id: "californiatrail", name: "californiatrail", displayName: "California Trail", isWildcardEligible: false },
        { id: "childrenszoo", name: "childrenszoo", displayName: "Children's Zoo", isWildcardEligible: false },
        { id: "tropicalrainforest", name: "tropicalrainforest", displayName: "Tropical Rainforest", isWildcardEligible: false },
        { id: "specialedition", name: "specialedition", displayName: "Special Edition", isWildcardEligible: false },
        { id: "booatthezoo", name: "booatthezoo", displayName: "Boo at the Zoo", isWildcardEligible: false },
        { id: "arcas", name: "arcas", displayName: "ARCAS", isWildcardEligible: false },
        { id: "newnaturefoundation", name: "newnaturefoundation", displayName: "New Nature Foundation", isWildcardEligible: false },
        { id: "disney", name: "disney", displayName: "Disney", isWildcardEligible: false },
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
        name: cat.displayName,
        isWildcardEligible: cat.isWildcardEligible
    }));
};