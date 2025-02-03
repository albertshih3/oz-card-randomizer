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
import { initializeApp } from "firebase/app";
import {
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  addDoc,
  getFirestore,
  collection as firestoreCollection,
} from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useAuth } from "@clerk/clerk-react";
import { Spinner } from "@heroui/spinner";
import DefaultLayout from "@/layouts/default";
import Unauthorized from "@/components/unauthorized";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const collections = [
  { id: "africansavanna", name: "African Savannah" },
  { id: "californiatrail", name: "California Trail" },
  { id: "childrenszoo", name: "Children's Zoo" },
  { id: "tropicalrainforest", name: "Tropical Rainforest" },
  { id: "specialedition", name: "Special Edition" },
  { id: "booatthezoo", name: "Boo at the Zoo" },
  { id: "arcas", name: "ARCAS" },
  { id: "newnaturefoundation", name: "New Nature Foundation" },
  { id: "disney", name: "Disney" },
];

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

  // Parse query parameters (e.g. ?cardId=...&collection=... or ?new=true)
  const searchParams = new URLSearchParams(location.search);
  const cardId = searchParams.get("cardId");
  const collectionId = searchParams.get("collection");
  const isNew = searchParams.get("new") === "true";

  useEffect(() => {
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
    const fetchCard = async () => {
      try {
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
            collectionName: collections.find((c) => c.id === collectionId)?.name,
          });
        }
      } catch (err) {
        console.error("Error fetching card:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [cardId, collectionId, getToken, isNew]);

  const handleSave = async (updatedCard: Card | null) => {
    if (!updatedCard) return;
    try {
      if (isNew) {
        // Create a new card
        const colRef = firestoreCollection(db, updatedCard.collection);
        await addDoc(colRef, {
          name: updatedCard.name,
          number: updatedCard.number,
          active: updatedCard.active,
          collection: updatedCard.collection,
        });
      } else {
        const cardRef = doc(db, updatedCard.collection, updatedCard.id);
        await updateDoc(cardRef, {
          name: updatedCard.name,
          number: updatedCard.number,
          active: updatedCard.active,
          collection: updatedCard.collection,
        });
      }
      navigate("/edit");
    } catch (err) {
      console.error("Error saving card:", err);
    }
  };

  const handleDelete = async (cardToDelete: Card) => {
    try {
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
