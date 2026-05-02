import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { useAuth } from "@clerk/clerk-react";
import { useAsyncList } from "@react-stately/data";
import { M3Spinner } from "@/components/m3/spinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  getKeyValue,
} from "@heroui/table";
import { M3Button } from "@/components/m3/button";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Tooltip } from "@heroui/tooltip";
import { motion } from "framer-motion";
import { Search, Plus, Edit2, AlertCircle } from "lucide-react";
import DefaultLayout from "@/layouts/default";
import Unauthorized from "@/components/unauthorized";
import { event } from "@/lib/gtag";
import { getCategories, categoriesToLegacyFormat } from "@/utils/categories";
import { db, auth } from "@/lib/firebase";
import { CollectionBadge } from "@/components/collection-badge";
import clsx from "clsx";
import type { Card } from "@/types/index";

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
              collectionName: colObj.name,
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
          if (first === undefined) first = "";
          if (second === undefined) second = "";
          const parsedFirst = parseInt(first as string, 10);
          const parsedSecond = parseInt(second as string, 10);
          const normFirst = !isNaN(parsedFirst)
            ? parsedFirst
            : (first as string);
          const normSecond = !isNaN(parsedSecond)
            ? parsedSecond
            : (second as string);
          let cmp =
            normFirst < normSecond ? -1 : normFirst > normSecond ? 1 : 0;
          if (sortDescriptor.direction === "descending") {
            cmp *= -1;
          }
          return cmp;
        }),
      };
    },
  });

  const reloadRef = useRef(list.reload);
  reloadRef.current = list.reload;

  useEffect(() => {
    if (!isLoaded || !userId || isAuthenticated) return;

    const signIntoFirebase = async () => {
      try {
        const token = await getToken({ template: "integration_firebase" });
        await signInWithCustomToken(auth, token || "");
        setIsAuthenticated(true);
        reloadRef.current();
      } catch (err) {
        console.error("Error signing into Firebase:", err);
      }
    };
    signIntoFirebase();
  }, [isLoaded, userId, getToken, isAuthenticated]);

  // Show sorting tooltip on first visit
  useEffect(() => {
    if (!loading && list.items.length > 0) {
      const hasSeenSortingTip = localStorage.getItem("hasSeenSortingTip");

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
      localStorage.setItem("hasSeenSortingTip", "true");
    }
  };

  const handleEditClick = (card: Card) => {
    event("select_content", { content_type: "button", item_id: "edit_card" });
    // Navigate to the edit page using query params for editing an existing card.
    navigate(`/editcard?cardId=${card.id}&collection=${card.collection}`);
  };

  const handleNewCardClick = () => {
    event("select_content", { content_type: "button", item_id: "new_card" });
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
        active: newActiveStatus,
      });

      event("card_status_toggled", {
        collection: card.collection,
        active: newActiveStatus,
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
    return (
      <div className="flex justify-center items-center h-screen">
        <M3Spinner size="lg" label="Loading" />
      </div>
    );
  }

  if (!userId) {
    return (
      <DefaultLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Unauthorized />
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6 py-8 md:py-12 max-w-7xl mx-auto"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Card Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage, edit, and organize your trading card collection.
            </p>
          </div>
          <M3Button
            variant="filled"
            onPress={handleNewCardClick}
            startContent={<Plus className="w-5 h-5" />}
            className="font-semibold shadow-md"
          >
            New Card
          </M3Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <M3Spinner size="lg" label="Loading" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
              <Input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:max-w-md"
                isClearable
                onClear={() => setSearchQuery("")}
                startContent={
                  <Search className="w-4 h-4 text-muted-foreground" />
                }
                variant="bordered"
              />
              {updatingCardId && (
                <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                  <M3Spinner size="sm" />
                  <span>Updating status...</span>
                </div>
              )}
            </div>

            <Tooltip
              content="💡 Click headers to sort!"
              isOpen={showSortingTooltip}
              placement="bottom-start"
              color="primary"
              offset={-10}
              showArrow
            >
              <div
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
                onMouseEnter={handleHeaderHover}
              >
                <Table
                  sortDescriptor={list.sortDescriptor}
                  onSortChange={list.sort}
                  aria-label="Cards table"
                  removeWrapper
                  classNames={{
                    th: "bg-muted/50 text-muted-foreground font-medium py-3",
                    td: "py-3 border-b border-border/50 last:border-0",
                  }}
                >
                  <TableHeader>
                    <TableColumn key="name" allowsSorting>
                      NAME
                    </TableColumn>
                    <TableColumn key="number" allowsSorting>
                      NUMBER
                    </TableColumn>
                    <TableColumn key="collectionName" allowsSorting>
                      COLLECTION
                    </TableColumn>
                    <TableColumn key="active" allowsSorting>
                      STATUS
                    </TableColumn>
                    <TableColumn key="actions" align="end">
                      ACTIONS
                    </TableColumn>
                  </TableHeader>
                  <TableBody
                    items={filteredItems}
                    loadingContent={<M3Spinner />}
                    emptyContent={
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mb-4 text-default-300" />
                        <p className="text-lg font-medium">No cards found</p>
                        <p className="text-sm">
                          Try adjusting your search query
                        </p>
                      </div>
                    }
                  >
                    {(item: Card) => (
                      <TableRow
                        key={item.id}
                        className={clsx(
                          "hover:bg-muted/30 transition-colors",
                          !item.active && "opacity-50 grayscale",
                        )}
                      >
                        {(columnKey) => (
                          <TableCell>
                            {columnKey === "actions" ? (
                              <div className="flex justify-end gap-2">
                                <M3Button
                                  size="sm"
                                  variant="tonal"
                                  color="primary"
                                  onPress={() => handleEditClick(item)}
                                  startContent={
                                    <Edit2 className="w-3.5 h-3.5" />
                                  }
                                >
                                  Edit
                                </M3Button>
                              </div>
                            ) : columnKey === "active" ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  isSelected={item.active}
                                  onValueChange={() => handleToggleActive(item)}
                                  size="sm"
                                  color="success"
                                  isDisabled={updatingCardId === item.id}
                                  thumbIcon={({ isSelected, className }) =>
                                    isSelected ? (
                                      <span className={className}>✓</span>
                                    ) : (
                                      <span className={className}>×</span>
                                    )
                                  }
                                />
                                <span
                                  className={`text-xs font-medium ${item.active ? "text-success" : "text-muted-foreground"}`}
                                >
                                  {item.active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            ) : columnKey === "collectionName" ? (
                              <CollectionBadge
                                collection={item.collection}
                                name={item.collectionName || item.collection}
                              />
                            ) : columnKey === "name" ? (
                              <span className="font-medium text-foreground">
                                {getKeyValue(item, columnKey)}
                              </span>
                            ) : (
                              getKeyValue(item, columnKey)
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Tooltip>
          </div>
        )}
      </motion.section>
    </DefaultLayout>
  );
}
