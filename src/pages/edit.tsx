import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useAuth } from "@clerk/clerk-react";
import { useAsyncList } from "@react-stately/data";
import { Spinner } from "@heroui/spinner";
import {
    Table,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
    getKeyValue,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { EditIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import Unauthorized from "@/components/unauthorized";
import { event } from "@/lib/gtag";

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
import { getFirestore } from "firebase/firestore";
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

export default function EditCardsPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const list = useAsyncList({
        async load() {
            const allCards: Card[] = [];
            try {
                for (const colObj of collections) {
                    const querySnapshot = await getDocs(collection(db, colObj.id));
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        allCards.push({
                            id: doc.id,
                            collection: colObj.id,
                            number: data.number,
                            active: data.active === true,
                            name: data.name,
                            collectionName: collections.find((c) => c.id === colObj.id)?.name,
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
        async sort({ items, sortDescriptor }) {
            return {
                items: items.sort((a, b) => {
                    let first = a[sortDescriptor.column as keyof Card];
                    let second = b[sortDescriptor.column as keyof Card];
                    if (first === undefined) first = '';
                    if (second === undefined) second = '';
                    let cmp = (parseInt(first as string) || first) < (parseInt(second as string) || second) ? -1 : 1;
                    if (sortDescriptor.direction === "descending") {
                        cmp *= -1;
                    }
                    return cmp;
                }),
            };
        },
    });

    useEffect(() => {
        const signIntoFirebase = async () => {
            const token = await getToken({ template: "integration_firebase" });
            await signInWithCustomToken(auth, token || "");
            list.reload();
        };
        signIntoFirebase();
    }, [getToken]);

    const handleEditClick = (card: Card) => {
        event({
            action: 'click',
            category: 'card_management',
            label: 'edit_card'
        });
        // Navigate to the edit page using query params for editing an existing card.
        navigate(`/editcard?cardId=${card.id}&collection=${card.collection}`);
    };

    const handleNewCardClick = () => {
        event({
            action: 'click',
            category: 'card_management',
            label: 'new_card'
        });
        // Navigate to the edit page with a query parameter indicating a new card.
        navigate("/editcard?new=true");
    };

    if (!isLoaded) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

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
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
                <h1 className="text-2xl font-bold">Edit Cards</h1>
                {loading ? (
                    <Spinner />
                ) : (
                    <Table sortDescriptor={list.sortDescriptor} onSortChange={list.sort}>
                        <TableHeader>
                            <TableColumn key="name" allowsSorting>Name</TableColumn>
                            <TableColumn key="number" allowsSorting>Number</TableColumn>
                            <TableColumn key="collectionName" allowsSorting>Collection</TableColumn>
                            <TableColumn key="actions">Actions</TableColumn>
                        </TableHeader>
                        <TableBody isLoading={loading} items={list.items} loadingContent={<Spinner label="Loading..." />}>
                            {(item: Card) => (
                                <TableRow key={item.id}>
                                    {(columnKey) =>
                                        <TableCell>
                                            {columnKey === "actions" ? (
                                                <div className="flex gap-2">
                                                    <Button variant="bordered" color="default" onPress={() => handleEditClick(item)}>
                                                        <EditIcon /> Edit Card
                                                    </Button>
                                                </div>
                                            ) : (
                                                getKeyValue(item, columnKey)
                                            )}
                                        </TableCell>
                                    }
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </section>
            {/* Sticky New Card Button */}
            <div
                style={{
                    position: "fixed",
                    bottom: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 1000,
                }}
            >
                <Button variant="solid" color="primary" onPress={handleNewCardClick}>
                    New Card
                </Button>
            </div>
        </DefaultLayout>
    );
}
