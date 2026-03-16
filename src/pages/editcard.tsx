import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  addDoc,
  collection as firestoreCollection,
  writeBatch,
} from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { useAuth } from "@clerk/clerk-react";
import { Spinner } from "@heroui/spinner";
import DefaultLayout from "@/layouts/default";
import Unauthorized from "@/components/unauthorized";
import { event } from "@/lib/gtag";
import { getCategories, categoriesToLegacyFormat } from "@/utils/categories";
import { db, auth } from "@/lib/firebase";
import { validateCardForm, CardFormErrors } from "@/utils/validation";
import { Save, Trash2, X } from "lucide-react";
import type { Card } from "@/types/index";

export default function EditCardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [collections, setCollections] = useState<
    { id: string; name: string }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<CardFormErrors>({});

  // Parse query parameters (e.g. ?cardId=...&collection=... or ?new=true)
  const searchParams = new URLSearchParams(location.search);
  const cardId = searchParams.get("cardId");
  const collectionId = searchParams.get("collection");
  const isNew = searchParams.get("new") === "true";

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories first
        const categories = await getCategories();
        const legacyCollections = categoriesToLegacyFormat(categories);
        setCollections(legacyCollections);

        if (isNew) {
          // For a new card, initialize an empty card object.
          setSelectedCard({
            id: "",
            collection: "",
            number: "",
            active: true, // Default to active for new cards
            name: "",
          });
          setLoading(false);
          return;
        }

        if (!cardId || !collectionId) return;

        const token = await getToken({ template: "integration_firebase" });
        await signInWithCustomToken(auth, token || "");
        const cardRef = doc(db, collectionId, cardId);
        const cardSnap = await getDoc(cardRef);
        if (cardSnap.exists()) {
          const data = cardSnap.data();
          setSelectedCard({
            id: cardId,
            collection: collectionId,
            number: data.number,
            active: data.active === true,
            name: data.name,
            collectionName: legacyCollections.find((c) => c.id === collectionId)
              ?.name,
          });
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [cardId, collectionId, getToken, isNew]);

  const handleSave = async (updatedCard: Card | null) => {
    if (!updatedCard) return;

    const errors = validateCardForm(updatedCard);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setIsSaving(true);
    try {
      // Ensure we're authenticated with Firebase before any write
      const ensureFirebaseAuth = async () => {
        if (!auth.currentUser) {
          const token = await getToken({ template: "integration_firebase" });
          await signInWithCustomToken(auth, token || "");
        }
      };

      await ensureFirebaseAuth();

      if (isNew) {
        event({
          action: "create",
          category: "card_management",
          label: "card_created",
        });
        // Create a new card
        const colRef = firestoreCollection(db, updatedCard.collection);
        await addDoc(colRef, {
          name: updatedCard.name,
          number: updatedCard.number,
          active: updatedCard.active,
        });
      } else {
        event({
          action: "update",
          category: "card_management",
          label: "card_updated",
        });
        if (!cardId || !collectionId)
          throw new Error("Missing card identifiers.");

        const data = {
          name: updatedCard.name,
          number: updatedCard.number,
          active: updatedCard.active,
        };

        if (updatedCard.collection === collectionId) {
          // Same collection: simple update
          const cardRef = doc(db, collectionId, updatedCard.id);
          await updateDoc(cardRef, data);
        } else {
          // Collection changed: move document by creating in new collection (same id) and deleting old one atomically
          const batch = writeBatch(db);
          const oldRef = doc(db, collectionId, updatedCard.id);
          const newRef = doc(db, updatedCard.collection, updatedCard.id);
          batch.set(newRef, data);
          batch.delete(oldRef);
          await batch.commit();
        }
      }
      navigate("/edit");
    } catch (err) {
      console.error("Error saving card:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cardToDelete: Card) => {
    if (
      !confirm(
        "Are you sure you want to delete this card? This action cannot be undone.",
      )
    )
      return;

    setIsSaving(true);
    try {
      // Ensure we're authenticated with Firebase before any write
      const token = await getToken({ template: "integration_firebase" });
      await signInWithCustomToken(auth, token || "");

      event({
        action: "delete",
        category: "card_management",
        label: "card_deleted",
      });
      const cardRef = doc(db, cardToDelete.collection, cardToDelete.id);
      await deleteDoc(cardRef);
      navigate("/edit");
    } catch (err) {
      console.error("Error deleting card:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center h-screen">
          <Spinner size="lg" color="primary" />
        </div>
      </DefaultLayout>
    );

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
    <div className="min-h-screen bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Background with subtle gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50"></div>
      </div>

      <Modal
        backdrop="blur"
        isOpen={true}
        onClose={() => navigate("/edit")}
        size="lg"
        classNames={{
          base: "bg-card border border-border shadow-2xl",
          header: "border-b border-border",
          footer: "border-t border-border",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">
              {isNew ? "Create New Card" : "Edit Card Details"}
            </h2>
            <p className="text-sm text-muted-foreground font-normal">
              {isNew
                ? "Add a new card to the collection."
                : "Update the details of this card."}
            </p>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Card Name"
                  placeholder="e.g. African Lion"
                  value={selectedCard?.name || ""}
                  onChange={(e) => {
                    setSelectedCard(
                      selectedCard
                        ? { ...selectedCard, name: e.target.value }
                        : null,
                    );
                    if (formErrors.name)
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  variant="bordered"
                  labelPlacement="outside"
                  isRequired
                  isInvalid={!!formErrors.name}
                  errorMessage={formErrors.name}
                />
                <Input
                  label="Card Number"
                  placeholder="e.g. 42"
                  value={selectedCard?.number || ""}
                  onChange={(e) => {
                    setSelectedCard(
                      selectedCard
                        ? { ...selectedCard, number: e.target.value }
                        : null,
                    );
                    if (formErrors.number)
                      setFormErrors((prev) => ({ ...prev, number: undefined }));
                  }}
                  variant="bordered"
                  labelPlacement="outside"
                  isRequired
                  isInvalid={!!formErrors.number}
                  errorMessage={formErrors.number}
                />
              </div>

              <Select
                label="Collection Category"
                placeholder="Select a category"
                selectedKeys={
                  selectedCard?.collection ? [selectedCard.collection] : []
                }
                onChange={(e) => {
                  setSelectedCard(
                    selectedCard
                      ? { ...selectedCard, collection: e.target.value }
                      : null,
                  );
                  if (formErrors.collection)
                    setFormErrors((prev) => ({
                      ...prev,
                      collection: undefined,
                    }));
                }}
                variant="bordered"
                labelPlacement="outside"
                isRequired
                isInvalid={!!formErrors.collection}
                errorMessage={formErrors.collection}
              >
                {collections.map((col) => (
                  <SelectItem key={col.id}>{col.name}</SelectItem>
                ))}
              </Select>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Active Status</span>
                  <span className="text-xs text-muted-foreground">
                    Inactive cards won&apos;t appear in packs
                  </span>
                </div>
                <Switch
                  isSelected={selectedCard?.active || false}
                  onValueChange={(isSelected) =>
                    setSelectedCard(
                      selectedCard
                        ? { ...selectedCard, active: isSelected }
                        : null,
                    )
                  }
                  color="success"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            {!isNew && selectedCard && (
              <Button
                onPress={() => handleDelete(selectedCard)}
                variant="light"
                color="danger"
                startContent={<Trash2 className="w-4 h-4" />}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button
              onPress={() => navigate("/edit")}
              variant="flat"
              startContent={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
            <Button
              onPress={() => handleSave(selectedCard)}
              color="primary"
              isLoading={isSaving}
              startContent={!isSaving && <Save className="w-4 h-4" />}
              className="font-semibold"
            >
              {isNew ? "Create Card" : "Save Changes"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
