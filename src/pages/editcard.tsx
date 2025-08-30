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


interface Card {
  id: string;
  collection: string;
  number: string;
  active: boolean;
  name: string;
  collectionName?: string;
}

export default function EditCardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [collections, setCollections] = useState<{id: string, name: string}[]>([]);

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
            active: false,
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
            collectionName: legacyCollections.find((c) => c.id === collectionId)?.name,
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
          action: 'create',
          category: 'card_management',
          label: 'card_created'
        });
        // Create a new card
        const colRef = firestoreCollection(db, updatedCard.collection);
        await addDoc(colRef, {
          name: updatedCard.name,
          number: updatedCard.number,
          active: updatedCard.active,
          collection: updatedCard.collection,
        });
      } else {
        event({
          action: 'update',
          category: 'card_management',
          label: 'card_updated'
        });
        if (!cardId || !collectionId) throw new Error("Missing card identifiers.");

        const data = {
          name: updatedCard.name,
          number: updatedCard.number,
          active: updatedCard.active,
          collection: updatedCard.collection,
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
    }
  };

  const handleDelete = async (cardToDelete: Card) => {
    try {
      // Ensure we're authenticated with Firebase before any write
      const token = await getToken({ template: "integration_firebase" });
      await signInWithCustomToken(auth, token || "");

      event({
        action: 'delete',
        category: 'card_management',
        label: 'card_deleted'
      });
      const cardRef = doc(db, cardToDelete.collection, cardToDelete.id);
      await deleteDoc(cardRef);
      navigate("/edit");
    } catch (err) {
      console.error("Error deleting card:", err);
    }
  };

  if (loading)
    return (
      <DefaultLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </DefaultLayout>
    );

  if (!userId) {
    return (
      <DefaultLayout>
        <div className="flex justify-center items-center h-screen">
          <Unauthorized />
          <Spinner />
        </div>
      </DefaultLayout>
    );
  }

  return (
    // Full page container with gradient background
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90% flex items-center justify-center">
      <Modal backdrop="blur" isOpen={true} onClose={() => navigate("/edit")}>
        <ModalContent>
          <ModalHeader>{isNew ? "Create Card" : "Edit Card"}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Card Name"
                value={selectedCard?.name || ""}
                onChange={(e) =>
                  setSelectedCard(
                    selectedCard ? { ...selectedCard, name: e.target.value } : null
                  )
                }
                className="w-full"
              />
              <Input
                label="Card Number"
                value={selectedCard?.number || ""}
                onChange={(e) =>
                  setSelectedCard(
                    selectedCard ? { ...selectedCard, number: e.target.value } : null
                  )
                }
                className="w-full"
              />
              <Select
                label="Category"
                value={selectedCard?.collection || ""}
                onChange={(e) =>
                  setSelectedCard(
                    selectedCard ? { ...selectedCard, collection: e.target.value } : null
                  )
                }
              >
                {collections.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </Select>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Active Status</label>
                <Switch
                  isSelected={selectedCard?.active || false}
                  onValueChange={(isSelected) =>
                    setSelectedCard(
                      selectedCard ? { ...selectedCard, active: isSelected } : null
                    )
                  }
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            {!isNew && selectedCard && (
              <Button onPress={() => handleDelete(selectedCard)} variant="solid" color="danger">
                Delete
              </Button>
            )}
            <Button onPress={() => navigate("/edit")} variant="ghost">
              Cancel
            </Button>
            <Button onPress={() => handleSave(selectedCard)} variant="solid" color="primary">
              {isNew ? "Create" : "Save Changes"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}