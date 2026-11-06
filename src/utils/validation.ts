import { RESERVED_COLLECTION_IDS } from "@/constants/collections";

export interface CardFormErrors {
  name?: string;
  number?: string;
  collection?: string;
  _form?: string;
}

interface CardFormData {
  name: string;
  number: string;
  collection: string;
  active: boolean;
}

export const validateCardForm = (card: CardFormData): CardFormErrors => {
  const errors: CardFormErrors = {};

  if (!card.name.trim()) {
    errors.name = "Card name is required.";
  } else if (card.name.trim().length > 200) {
    errors.name = "Card name must be 200 characters or fewer.";
  }

  if (!card.number.trim()) {
    errors.number = "Card number is required.";
  } else if (!/^\d{1,10}$/.test(card.number.trim())) {
    errors.number =
      "Card number must be a non-negative integer (e.g., 0 or 42).";
  }

  if (!card.collection) {
    errors.collection = "Please select a collection.";
  }

  if (typeof card.active !== "boolean") {
    console.error(
      "validateCardForm: active field is not a boolean. Write blocked.",
    );
    errors._form = "blocked";
  }

  return errors;
};

export interface CategoryFormErrors {
  displayName?: string;
  categoryId?: string;
}

interface CategoryFormData {
  displayName: string;
  categoryId: string;
}

export const normalizeCategoryId = (raw: string): string =>
  raw.toLowerCase().replace(/\s+/g, "");

export const validateCategoryForm = (
  data: CategoryFormData,
): CategoryFormErrors => {
  const errors: CategoryFormErrors = {};

  if (!data.displayName.trim()) {
    errors.displayName = "Display name is required.";
  } else if (data.displayName.trim().length > 100) {
    errors.displayName = "Display name must be 100 characters or fewer.";
  }

  const normalizedId = normalizeCategoryId(data.categoryId);

  if (!normalizedId) {
    errors.categoryId = "Category ID is required.";
  } else if (!/^[a-z0-9]+$/.test(normalizedId)) {
    errors.categoryId = "Category ID can only contain letters and numbers.";
  } else if (normalizedId.length > 64) {
    errors.categoryId = "Category ID must be 64 characters or fewer.";
  } else if (RESERVED_COLLECTION_IDS.includes(normalizedId)) {
    errors.categoryId = "This Category ID is reserved.";
  }

  return errors;
};
