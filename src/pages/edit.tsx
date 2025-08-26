import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
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
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Tooltip } from "@heroui/tooltip";
import { EditIcon } from "@/components/icons";
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

export default function EditCardsPage() {
    const { isLoaded, userId, getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [updatingCardId, setUpdatingCardId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showSortingTooltip, setShowSortingTooltip] = useState(false);
    const navigate = useNavigate();

    const list = useAsyncList({
        async load() {
            const allCards: Card[] = [];
            try {
                // Load categories first
                const categories = await getCategories();
                const legacyCollections = categoriesToLegacyFormat(categories);

                for (const colObj of legacyCollections) {
                    const querySnapshot = await getDocs(collection(db, colObj.id));
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        allCards.push({
                            id: doc.id,
                            collection: colObj.id,
                            number: data.number,
                            active: data.active === true,
                            name: data.name,
                            collectionName: legacyCollections.find((c) => c.id === colObj.id)?.name,
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
        if (!isLoaded || !userId || isAuthenticated) return;
        
        const signIntoFirebase = async () => {
            try {
                const token = await getToken({ template: "integration_firebase" });
                await signInWithCustomToken(auth, token || "");
                setIsAuthenticated(true);
                list.reload();
            } catch (err) {
                console.error("Error signing into Firebase:", err);
            }
        };
        signIntoFirebase();
    }, [isLoaded, userId, getToken, isAuthenticated]);

    // Show sorting tooltip on first visit
    useEffect(() => {
        if (!loading && list.items.length > 0) {
            const hasSeenSortingTip = localStorage.getItem('hasSeenSortingTip');
            
            if (!hasSeenSortingTip) {
                const timer = setTimeout(() => {
                    setShowSortingTooltip(true);
                }, 1500);
                
                return () => clearTimeout(timer);
            }
        }
    }, [loading, list.items.length]);

    const handleHeaderHover = () => {
        if (showSortingTooltip) {
            setShowSortingTooltip(false);
            localStorage.setItem('hasSeenSortingTip', 'true');
        }
    };

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

    const handleToggleActive = async (card: Card) => {
        if (updatingCardId) return; // Prevent multiple toggles at once
        
        try {
            setUpdatingCardId(card.id);
            const cardRef = doc(db, card.collection, card.id);
            const newActiveStatus = !card.active;
            
            await updateDoc(cardRef, {
                active: newActiveStatus
            });

            event({
                action: 'toggle',
                category: 'card_management',
                label: 'card_status_toggled'
            });

            // Reload the list to get updated data
            list.reload();
        } catch (err) {
            console.error("Error updating card status:", err);
        } finally {
            setUpdatingCardId(null);
        }
    };

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) {
            return list.items;
        }

        const query = searchQuery.toLowerCase().trim();
        return list.items.filter((card: Card) => {
            // Search by name
            const nameMatch = card.name?.toLowerCase().includes(query);
            // Search by number (convert to string first)
            const numberMatch = card.number?.toString().toLowerCase().includes(query);
            // Search by collection name/category
            const categoryMatch = card.collectionName?.toLowerCase().includes(query);

            return nameMatch || numberMatch || categoryMatch;
        });
    }, [list.items, searchQuery]);

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
                    <>
                        <div className="w-full max-w-4xl mb-4">
                            <Input
                                type="text"
                                placeholder="Search cards by name, number, or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full"
                                isClearable
                                onClear={() => setSearchQuery("")}
                            />
                        </div>
                        {updatingCardId && (
                            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-600">
                                <Spinner size="sm" />
                                <span>Updating card status...</span>
                            </div>
                        )}
                        <Tooltip
                            content="💡 Click on column headers to sort the table by that column!"
                            isOpen={showSortingTooltip}
                            placement="bottom"
                            color="primary"
                            offset={10}
                        >
                            <div className="w-full" onMouseEnter={handleHeaderHover}>
                                <Table sortDescriptor={list.sortDescriptor} onSortChange={list.sort} className="w-full">
                                    <TableHeader>
                                        <TableColumn key="name" allowsSorting>Name</TableColumn>
                                        <TableColumn key="number" allowsSorting>Number</TableColumn>
                                        <TableColumn key="collectionName" allowsSorting>Collection</TableColumn>
                                        <TableColumn key="active" allowsSorting>Active</TableColumn>
                                        <TableColumn key="actions">Actions</TableColumn>
                                    </TableHeader>
                            <TableBody isLoading={loading} items={filteredItems} loadingContent={<Spinner label="Loading..." />}>
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
                                                ) : columnKey === "active" ? (
                                                    <Switch
                                                        isSelected={item.active}
                                                        onValueChange={() => handleToggleActive(item)}
                                                        size="sm"
                                                        isDisabled={updatingCardId === item.id}
                                                    />
                                                ) : (
                                                    getKeyValue(item, columnKey)
                                                )}
                                            </TableCell>
                                        }
                                    </TableRow>
                                )}
                            </TableBody>
                                </Table>
                            </div>
                        </Tooltip>
                    </>
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
