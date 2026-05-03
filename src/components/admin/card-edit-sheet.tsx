import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { M3Button } from "@/components/m3/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import {
  collection as firestoreCollection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "@clerk/clerk-react";
import { db } from "@/lib/firebase";
import { ensureFirebaseAuth } from "@/lib/firebase-auth";
import { event } from "@/lib/gtag";
import { validateCardForm, CardFormErrors } from "@/utils/validation";
import { BottomSheet } from "@/components/m3/bottom-sheet";
import { M3Spinner } from "@/components/m3/spinner";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Card } from "@/types/index";
import type { Category } from "@/utils/categories";
import { Trash2, Save, X } from "lucide-react";

type EditMode = "create" | "edit";

interface CardEditSheetProps {
  mode: EditMode;
  card?: Card;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}

interface FormContentProps {
  formData: {
    name: string;
    number: string;
    collection: string;
    active: boolean;
  };
  formErrors: CardFormErrors;
  isSaving: boolean;
  showDeleteConfirm: boolean;
  mode: EditMode;
  categories: Category[];
  onNameChange: (v: string) => void;
  onNumberChange: (v: string) => void;
  onCollectionChange: (v: string) => void;
  onActiveChange: (v: boolean) => void;
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
  categories,
  onNameChange,
  onNumberChange,
  onCollectionChange,
  onActiveChange,
  onSave,
  onDelete,
  onDeleteConfirm,
  onDeleteCancel,
  onClose,
}: FormContentProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        label="Card Name"
        value={formData.name}
        onValueChange={onNameChange}
        isInvalid={!!formErrors.name}
        errorMessage={formErrors.name}
        isDisabled={isSaving}
      />
      <Input
        label="Card Number"
        value={formData.number}
        onValueChange={onNumberChange}
        isInvalid={!!formErrors.number}
        errorMessage={formErrors.number}
        isDisabled={isSaving}
      />
      <Select
        label="Collection"
        selectedKeys={formData.collection ? [formData.collection] : []}
        onSelectionChange={(keys) => {
          const val = Array.from(keys)[0] as string;
          if (val) onCollectionChange(val);
        }}
        isInvalid={!!formErrors.collection}
        errorMessage={formErrors.collection}
        isDisabled={isSaving}
      >
        {categories.map((cat) => (
          <SelectItem key={cat.name}>{cat.displayName}</SelectItem>
        ))}
      </Select>
      <Switch
        isSelected={formData.active}
        onValueChange={onActiveChange}
        isDisabled={isSaving}
      >
        Active
      </Switch>

      {showDeleteConfirm && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: "var(--md-sys-color-error-container, #ffdad6)",
          }}
        >
          <p className="text-label-large font-medium">
            Delete this card permanently?
          </p>
          <div className="flex gap-2">
            <M3Button
              size="sm"
              variant="tonal"
              onPress={onDeleteCancel}
              isDisabled={isSaving}
            >
              Cancel
            </M3Button>
            <M3Button
              size="sm"
              variant="filled"
              color="error"
              onPress={onDeleteConfirm}
              isLoading={isSaving}
              spinner={<M3Spinner size="sm" color="currentColor" />}
            >
              Delete permanently
            </M3Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        {mode === "edit" && !showDeleteConfirm && (
          <M3Button
            variant="outlined"
            color="error"
            onPress={onDelete}
            isDisabled={isSaving}
            startContent={<Trash2 size={16} />}
          >
            Delete
          </M3Button>
        )}
        <div className="flex gap-2 ml-auto">
          <M3Button variant="tonal" onPress={onClose} isDisabled={isSaving}>
            Cancel
          </M3Button>
          <M3Button
            variant="filled"
            onPress={onSave}
            isLoading={isSaving}
            spinner={<M3Spinner size="sm" color="currentColor" />}
            startContent={<Save size={16} />}
          >
            Save
          </M3Button>
        </div>
      </div>
    </div>
  );
}

export function CardEditSheet({
  mode,
  card,
  categories,
  isOpen,
  onClose,
  onSaved,
  onError,
}: CardEditSheetProps) {
  const { getToken } = useAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [formData, setFormData] = useState({
    name: "",
    number: "",
    collection: "",
    active: true,
  });
  const [formErrors, setFormErrors] = useState<CardFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormErrors({});
      setShowDeleteConfirm(false);
      return;
    }
    if (mode === "create") {
      setFormData({ name: "", number: "", collection: "", active: true });
    } else if (card) {
      setFormData({
        name: card.name,
        number: card.number,
        collection: card.collection,
        active: card.active,
      });
    }
  }, [isOpen, mode, card]);

  const handleSave = async () => {
    const errors = validateCardForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setIsSaving(true);
    try {
      await ensureFirebaseAuth(getToken);
      // collection field is NEVER included in Firestore write payloads
      const payload = {
        name: formData.name.trim(),
        number: formData.number.trim(),
        active: formData.active,
      };

      if (mode === "create") {
        await addDoc(firestoreCollection(db, formData.collection), payload);
        event("card_created", { collection: formData.collection });
      } else if (card) {
        if (formData.collection === card.collection) {
          await updateDoc(doc(db, card.collection, card.id), payload);
          event("card_updated", { collection: card.collection });
        } else {
          const batch = writeBatch(db);
          const newRef = doc(firestoreCollection(db, formData.collection));
          batch.set(newRef, payload);
          batch.delete(doc(db, card.collection, card.id));
          await batch.commit();
          event("card_moved", {
            from_collection: card.collection,
            to_collection: formData.collection,
          });
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      onError("Failed to save card.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    setIsSaving(true);
    try {
      await ensureFirebaseAuth(getToken);
      await deleteDoc(doc(db, card.collection, card.id));
      event("card_deleted", { collection: card.collection });
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      onError("Failed to delete card.");
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
    categories,
    onNameChange: (v) => {
      setFormData((p) => ({ ...p, name: v }));
      setFormErrors((p) => ({ ...p, name: undefined }));
    },
    onNumberChange: (v) => {
      setFormData((p) => ({ ...p, number: v }));
      setFormErrors((p) => ({ ...p, number: undefined }));
    },
    onCollectionChange: (v) => {
      setFormData((p) => ({ ...p, collection: v }));
      setFormErrors((p) => ({ ...p, collection: undefined }));
    },
    onActiveChange: (v) => setFormData((p) => ({ ...p, active: v })),
    onSave: handleSave,
    onDelete: () => setShowDeleteConfirm(true),
    onDeleteConfirm: handleDelete,
    onDeleteCancel: () => setShowDeleteConfirm(false),
    onClose,
  };

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        aria-labelledby="card-edit-title"
      >
        <div className="px-2 pb-6">
          <h2
            id="card-edit-title"
            className="text-title-large px-4 pt-2 pb-2"
            style={{ color: "var(--md-sys-color-on-surface)" }}
          >
            {mode === "create" ? "New Card" : "Edit Card"}
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
      size="lg"
      hideCloseButton
      aria-labelledby="card-edit-title"
      classNames={{
        base: "rounded-3xl",
        header: "border-b-0 pb-0",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <span
                id="card-edit-title"
                style={{ color: "var(--md-sys-color-on-surface)" }}
              >
                {mode === "create" ? "New Card" : "Edit Card"}
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1 rounded-full"
                style={{ color: "var(--md-sys-color-on-surface-variant)" }}
              >
                <X size={20} />
              </button>
            </ModalHeader>
            <ModalBody>
              <FormContent {...formContentProps} />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
