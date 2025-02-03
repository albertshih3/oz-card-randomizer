import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useAuth } from "@clerk/clerk-react";
import { Spinner } from "@heroui/spinner";
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from "@heroui/table";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Select, SelectItem } from "@heroui/select";
import { Tooltip } from "@heroui/tooltip";
import { DeleteIcon, EditIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import Unauthorized from "@/components/unauthorized";
import { useAsyncList } from "@react-stately/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";

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

export default function EditPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);

    const list = useAsyncList({
        async load() {
            const allCards = [];
            try {
                for (const collectionObj of collections) {
                    const querySnapshot = await getDocs(collection(db, collectionObj.id));
                    querySnapshot.forEach((doc) => {
                        const docData = doc.data();
                        allCards.push({
                            id: doc.id,
                            collection: collectionObj.id,
                            number: docData.number,
                            active: docData.active === true,
                            name: docData.name,
                            collectionName: collections.find(c => c.id === collectionObj.id)?.name
                        });
                    });
                }
                setLoading(false);
                return { items: allCards };
            } catch (err) {
                console.error("Error fetching cards:", err);
                setLoading(false);
                return { items: [] };
            }
        },
    });

    useEffect(() => {
        const signIntoFirebaseWithClerk = async () => {
            const token = await getToken({ template: "integration_firebase" });
            await signInWithCustomToken(auth, token || "");
            list.reload();
        };

        signIntoFirebaseWithClerk();
    }, [getToken]);

    const handleEditClick = (card) => {
        setSelectedCard(card);
        setIsDialogOpen(true);
    };

    const handleSave = async (updatedCard) => {
        try {
            const cardRef = doc(db, updatedCard.collection, updatedCard.id);
            await updateDoc(cardRef, {
                name: updatedCard.name,
                number: updatedCard.number,
                active: updatedCard.active,
                collection: updatedCard.collection,
            });
            list.reload();
        } catch (err) {
            console.error("Error updating card:", err);
        } finally {
            setIsDialogOpen(false);
        }
    };

    const handleDelete = async (cardToDelete) => {
        try {
            const cardRef = doc(db, cardToDelete.collection, cardToDelete.id);
            await deleteDoc(cardRef);
            list.reload();
        } catch (err) {
            console.error("Error deleting card:", err);
        } finally {
            setIsDialogOpen(false);
        }
    };

    if (!isLoaded) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (!userId) {
        return (
            <>
                <Unauthorized />
                <DefaultLayout>
                    <div className="flex justify-center items-center h-screen">
                        <Spinner />
                    </div>
                </DefaultLayout>
            </>
        );
    }

    return (
        <>
            <DefaultLayout>
                <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
                    <h1 className="text-2xl font-bold">Edit Cards</h1>
                    {loading ? (
                        <Spinner />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableColumn>Name</TableColumn>
                                <TableColumn>Number</TableColumn>
                                <TableColumn>Collection</TableColumn>
                                <TableColumn>Active</TableColumn>
                                <TableColumn>Actions</TableColumn>
                            </TableHeader>
                            <TableBody>
                                {list.items.map((card) => (
                                    <TableRow key={card.id}>
                                        <TableCell>{card.name}</TableCell>
                                        <TableCell>{card.number}</TableCell>
                                        <TableCell>{card.collectionName}</TableCell>
                                        <TableCell>
                                            <Switch isSelected={card.active} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Tooltip content="Edit Card">
                                                    <Button variant="bordered" onPress={() => handleEditClick(card)}><EditIcon /> Edit Card</Button>
                                                </Tooltip>
                                                <Tooltip content="Delete Card">
                                                    <div onClick={() => handleDelete(card)} className="cursor-pointer">
                                                        <DeleteIcon />
                                                    </div>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </section>



            </DefaultLayout>

            {/* Modal Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full border border-gray-300">
                    <DialogHeader>
                        <DialogTitle>{selectedCard ? "Edit Card" : "Create Card"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            label="Card Name"
                            value={selectedCard?.name || ""}
                            onChange={(e) => setSelectedCard({ ...selectedCard, name: e.target.value })}
                            className="w-full"
                        />
                        <Input
                            label="Card Number"
                            value={selectedCard?.number || ""}
                            onChange={(e) => setSelectedCard({ ...selectedCard, number: e.target.value })}
                            className="w-full"
                        />
                        <Select
                            label="Category"
                            value={selectedCard?.collection || ""}
                            onChange={(e) => setSelectedCard({ ...selectedCard, collection: e.target.value })}
                            className="w-full"
                        >
                            {collections.map((collection) => (
                                <SelectItem key={collection.id} value={collection.id}>{collection.name}</SelectItem>
                            ))}
                        </Select>
                    </div>
                    <DialogFooter className="flex justify-between mt-6">
                        {selectedCard && (
                            <Button onClick={() => handleDelete(selectedCard)} variant="outline" color="secondary">
                                Delete
                            </Button>
                        )}
                        <Button onClick={() => setIsDialogOpen(false)} variant="ghost">Cancel</Button>
                        <Button onClick={() => handleSave(selectedCard)} variant="solid" color="primary">
                            {selectedCard ? "Save Changes" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


        </>
    );
}
