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
  }

  if (!card.number.trim()) {
    errors.number = "Card number is required.";
  } else if (!/^\d+$/.test(card.number.trim())) {
    errors.number = "Card number must be a non-negative integer (e.g., 0 or 42).";
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

export const validateCategoryForm = (
  data: CategoryFormData,
): CategoryFormErrors => {
  const errors: CategoryFormErrors = {};

  if (!data.displayName.trim()) {
    errors.displayName = "Display name is required.";
  }

  const normalizedId = data.categoryId.toLowerCase().replace(/\s+/g, "");

  if (!normalizedId) {
    errors.categoryId = "Category ID is required.";
  } else if (!/^[a-z0-9]+$/.test(normalizedId)) {
    errors.categoryId = "Category ID can only contain letters and numbers.";
  }

  return errors;
};
