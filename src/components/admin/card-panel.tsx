import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@clerk/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  listContainerVariants,
  listItemVariants,
  pageVariants,
} from "@/lib/motion";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ensureFirebaseAuth } from "@/lib/firebase-auth";
import { getCategories } from "@/utils/categories";
import { readCollections } from "@/utils/cards";
import type { Category } from "@/utils/categories";
import {
  COLLECTION_DISPLAY_NAMES,
  REQUIRED_COLLECTION_IDS,
} from "@/constants/collections";
import { useAdminFiltersContext } from "@/contexts/admin-filters-context";
import type { ViewMode } from "@/hooks/use-admin-filters";
import { LinearProgress } from "@/components/m3/linear-progress";
import { M3Snackbar } from "@/components/m3/snackbar";
import { CardEditSheet } from "@/components/admin/card-edit-sheet";
import { CollectionBadge } from "@/components/collection-badge";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { M3Button } from "@/components/m3/button";
import { Table2, LayoutGrid, List, Plus, Pencil } from "lucide-react";
import type { Card } from "@/types/index";

interface SortDescriptor {
  column: "name" | "number" | "collection" | "active";
  direction: "ascending" | "descending";
}

const cardKey = (card: Card) => `${card.collection}:${card.id}`;

function getDisplayName(
  collectionId: string,
  categoryMap?: Record<string, string>,
): string {
  return (
    categoryMap?.[collectionId] ??
    COLLECTION_DISPLAY_NAMES[collectionId] ??
    collectionId
  );
}

export function CardPanel() {
  const { filters, setViewMode, setSearchQuery, setStatusFilter } =
    useAdminFiltersContext();
  const { getToken } = useAuth();

  const [cards, setCards] = useState<Card[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [malformedCount, setMalformedCount] = useState(0);
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());
  const latestRequest = useRef(0);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Card | null>(null);
  const [editMode, setEditMode] = useState<"create" | "edit">("create");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  // Merge Firestore category display names with hardcoded ones, Firestore wins
  const categoryDisplayMap = useMemo(() => {
    const map: Record<string, string> = { ...COLLECTION_DISPLAY_NAMES };
    for (const cat of categories) {
      map[cat.name] = cat.displayName;
    }
    return map;
  }, [categories]);

  const fetchCards = useCallback(async () => {
    // Only the latest request may update state, so switching categories while
    // a read is in flight can never show the previous category's cards.
    const requestId = ++latestRequest.current;
    const isLatest = () => requestId === latestRequest.current;

    setIsPending(true);
    setLoadError(null);
    try {
      const allCategories = await getCategories();
      if (!isLatest()) return;
      setCategories(allCategories);

      // Required sets are included even if their metadata is missing.
      const collectionsToFetch =
        filters.selectedCategory === "all"
          ? Array.from(
              new Set([
                ...allCategories.map((c) => c.name),
                ...REQUIRED_COLLECTION_IDS,
              ]),
            )
          : [filters.selectedCategory];

      const { byCollection, malformed } =
        await readCollections(collectionsToFetch);
      if (!isLatest()) return;
      setCards(Object.values(byCollection).flat());
      setMalformedCount(malformed);
    } catch (err) {
      console.error("Error fetching cards:", err);
      if (isLatest()) setLoadError("Failed to load cards.");
    } finally {
      if (isLatest()) setIsPending(false);
    }
  }, [filters.selectedCategory]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const filteredCards = useMemo(() => {
    const q = filters.searchQuery.toLowerCase();
    const filtered = cards
      .filter((card) => {
        if (q) {
          return (
            String(card.name ?? "")
              .toLowerCase()
              .includes(q) ||
            String(card.number ?? "")
              .toLowerCase()
              .includes(q)
          );
        }
        return true;
      })
      .filter((card) => {
        if (filters.statusFilter === "active") return card.active === true;
        if (filters.statusFilter === "inactive") return card.active === false;
        return true;
      });

    // Grid: sort by category display name, then by card name within category
    if (filters.viewMode === "grid") {
      return [...filtered].sort((a, b) => {
        const ca = getDisplayName(a.collection, categoryDisplayMap);
        const cb = getDisplayName(b.collection, categoryDisplayMap);
        const cmp = ca.localeCompare(cb);
        return cmp !== 0
          ? cmp
          : String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
    }

    // List: sort by card number ascending
    if (filters.viewMode === "list") {
      return [...filtered].sort((a, b) => {
        const pa = parseInt(String(a.number ?? ""), 10);
        const pb = parseInt(String(b.number ?? ""), 10);
        return (isNaN(pa) ? 0 : pa) - (isNaN(pb) ? 0 : pb);
      });
    }

    // Table: user-controlled sort via sortDescriptor
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortDescriptor.column) {
        case "name":
          cmp = String(a.name ?? "").localeCompare(String(b.name ?? ""));
          break;
        case "number": {
          const pa = parseInt(String(a.number ?? ""), 10);
          const pb = parseInt(String(b.number ?? ""), 10);
          cmp = (isNaN(pa) ? 0 : pa) - (isNaN(pb) ? 0 : pb);
          break;
        }
        case "collection":
          cmp = getDisplayName(a.collection, categoryDisplayMap).localeCompare(
            getDisplayName(b.collection, categoryDisplayMap),
          );
          break;
        case "active":
          cmp = Number(b.active) - Number(a.active);
          break;
      }
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [
    cards,
    filters.searchQuery,
    filters.statusFilter,
    filters.viewMode,
    sortDescriptor,
    categoryDisplayMap,
  ]);

  // One write per card at a time, so a late failure cannot undo a later toggle.
  const handleToggleActive = async (card: Card) => {
    const key = cardKey(card);
    if (togglingKeys.has(key)) return;
    const setActive = (active: boolean) =>
      setCards((prev) =>
        prev.map((c) => (cardKey(c) === key ? { ...c, active } : c)),
      );

    setTogglingKeys((prev) => new Set(prev).add(key));
    setActive(!card.active);
    try {
      await ensureFirebaseAuth(getToken);
      await updateDoc(doc(db, card.collection, card.id), {
        active: !card.active,
      });
    } catch (err) {
      console.error(err);
      setActive(card.active);
      setSnackbarMessage("Failed to update card.");
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const openCreateSheet = () => {
    setEditMode("create");
    setEditTarget(null);
    setEditSheetOpen(true);
  };

  const openEditSheet = (card: Card) => {
    setEditMode("edit");
    setEditTarget(card);
    setEditSheetOpen(true);
  };

  const viewModes: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: "table", label: "Table", icon: <Table2 size={16} /> },
    { key: "grid", label: "Grid", icon: <LayoutGrid size={16} /> },
    { key: "list", label: "List", icon: <List size={16} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <LinearProgress visible={isPending} className="mb-3" />

      {/* Header toolbar */}
      <div
        data-tutorial-id="card-toolbar"
        className="flex flex-wrap items-center gap-3 mb-4"
      >
        <Input
          aria-label="Search cards"
          placeholder="Search cards..."
          value={filters.searchQuery}
          onValueChange={setSearchQuery}
          className="max-w-xs"
          size="sm"
        />
        <Select
          selectedKeys={[filters.statusFilter]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0] as string;
            if (val) setStatusFilter(val as "all" | "active" | "inactive");
          }}
          className="max-w-[140px]"
          size="sm"
          aria-label="Status filter"
        >
          <SelectItem key="all">All</SelectItem>
          <SelectItem key="active">Active</SelectItem>
          <SelectItem key="inactive">Inactive</SelectItem>
        </Select>

        {/* View toggle segmented button */}
        <div
          className="flex rounded-xl overflow-hidden border"
          style={{ borderColor: "var(--md-sys-color-outline-variant)" }}
        >
          {viewModes.map((vm) => (
            <button
              key={vm.key}
              onClick={() => setViewMode(vm.key)}
              aria-label={`${vm.label} view`}
              aria-pressed={filters.viewMode === vm.key}
              className="flex items-center gap-1.5 px-3 py-1.5 text-label-medium transition-colors"
              style={
                filters.viewMode === vm.key
                  ? {
                      background: "var(--md-sys-color-secondary-container)",
                      color: "var(--md-sys-color-on-secondary-container)",
                    }
                  : {
                      background: "transparent",
                      color: "var(--md-sys-color-on-surface-variant)",
                    }
              }
            >
              {vm.icon}
              <span className="hidden sm:inline">{vm.label}</span>
            </button>
          ))}
        </div>

        <M3Button
          data-tutorial-id="new-card-btn"
          variant="filled"
          size="sm"
          className="hidden lg:flex ml-auto"
          onPress={openCreateSheet}
          startContent={<Plus size={16} />}
        >
          New Card
        </M3Button>
      </div>

      {loadError && !isPending && (
        <div
          role="alert"
          className="rounded-2xl p-4 mb-3 flex items-center justify-between"
          style={{
            background: "var(--md-sys-color-error-container)",
            color: "var(--md-sys-color-on-error-container)",
          }}
        >
          <p className="text-body-medium">{loadError}</p>
          <button
            onClick={fetchCards}
            className="text-label-large hover:opacity-80 transition-opacity ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Card count */}
      <p
        className="text-body-medium mb-3"
        style={{ color: "var(--md-sys-color-on-surface-variant)" }}
      >
        {filteredCards.length} card{filteredCards.length !== 1 ? "s" : ""}
        {filters.selectedCategory !== "all" ? " in selected category" : ""}
        {malformedCount > 0 &&
          ` · ${malformedCount} hidden because of missing data`}
      </p>

      {!isPending && !loadError && filteredCards.length === 0 && (
        <p
          className="text-body-medium py-6 text-center"
          style={{ color: "var(--md-sys-color-on-surface-variant)" }}
        >
          {cards.length === 0
            ? "No cards yet."
            : "No cards match your search or filter."}
        </p>
      )}

      <div data-tutorial-id="card-list">
        <AnimatePresence mode="wait" initial={false}>
          {/* Table view */}
          {filters.viewMode === "table" && (
            <motion.div
              key="view-table"
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="overflow-x-auto">
                <Table
                  aria-label="Cards"
                  removeWrapper
                  sortDescriptor={sortDescriptor}
                  onSortChange={(descriptor) =>
                    setSortDescriptor(descriptor as SortDescriptor)
                  }
                >
                  <TableHeader>
                    <TableColumn key="name" allowsSorting>
                      Name
                    </TableColumn>
                    <TableColumn key="number" allowsSorting>
                      Number
                    </TableColumn>
                    <TableColumn key="collection" allowsSorting>
                      Collection
                    </TableColumn>
                    <TableColumn key="active" allowsSorting>
                      Active
                    </TableColumn>
                    <TableColumn key="actions">Actions</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {filteredCards.map((card) => (
                      <TableRow key={`${card.collection}:${card.id}`}>
                        <TableCell>{card.name}</TableCell>
                        <TableCell>{card.number}</TableCell>
                        <TableCell>
                          <CollectionBadge
                            collection={card.collection}
                            name={getDisplayName(
                              card.collection,
                              categoryDisplayMap,
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            aria-label={`${card.name} active`}
                            isSelected={card.active}
                            isDisabled={togglingKeys.has(cardKey(card))}
                            onValueChange={() => handleToggleActive(card)}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => openEditSheet(card)}
                            aria-label={`Edit ${card.name}`}
                            className="p-2 rounded-lg"
                            style={{ color: "var(--md-sys-color-primary)" }}
                          >
                            <Pencil size={16} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}

          {/* Grid view */}
          {filters.viewMode === "grid" && (
            <motion.div
              key={`view-grid-${filters.selectedCategory}`}
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto"
            >
              {filteredCards.map((card) => (
                <motion.div
                  key={`${card.collection}:${card.id}`}
                  variants={listItemVariants}
                  className="rounded-2xl p-3 border flex flex-col gap-2"
                  style={{
                    borderColor: "var(--md-sys-color-outline-variant)",
                    background: "var(--md-sys-color-surface-variant)",
                  }}
                >
                  <CollectionBadge
                    collection={card.collection}
                    name={getDisplayName(card.collection, categoryDisplayMap)}
                  />
                  <p
                    className="text-label-large"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    {card.name}
                  </p>
                  <p
                    className="text-label-medium"
                    style={{
                      color: "var(--md-sys-color-on-surface-variant)",
                    }}
                  >
                    #{card.number}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className="text-label-medium px-2 py-0.5 rounded-full"
                      style={
                        card.active
                          ? {
                              background:
                                "var(--md-sys-color-primary-container)",
                              color: "var(--md-sys-color-on-primary-container)",
                            }
                          : {
                              background: "var(--md-sys-color-surface-variant)",
                              color: "var(--md-sys-color-on-surface-variant)",
                            }
                      }
                    >
                      {card.active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => openEditSheet(card)}
                      aria-label={`Edit ${card.name}`}
                      className="p-2.5 -m-2.5 rounded-lg"
                      style={{ color: "var(--md-sys-color-primary)" }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* List view */}
          {filters.viewMode === "list" && (
            <motion.div
              key={`view-list-${filters.selectedCategory}`}
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="divide-y overflow-y-auto"
              style={{ borderColor: "var(--md-sys-color-outline-variant)" }}
            >
              {filteredCards.map((card) => (
                <motion.div
                  key={`${card.collection}:${card.id}`}
                  variants={listItemVariants}
                  className="flex items-center gap-3 py-2"
                >
                  <CollectionBadge
                    collection={card.collection}
                    name={getDisplayName(card.collection, categoryDisplayMap)}
                  />
                  <span
                    className="flex-1 text-body-medium"
                    style={{ color: "var(--md-sys-color-on-surface)" }}
                  >
                    {card.name}
                  </span>
                  <span
                    className="text-label-medium"
                    style={{
                      color: "var(--md-sys-color-on-surface-variant)",
                    }}
                  >
                    #{card.number}
                  </span>
                  <Switch
                    aria-label={`${card.name} active`}
                    isSelected={card.active}
                    isDisabled={togglingKeys.has(cardKey(card))}
                    onValueChange={() => handleToggleActive(card)}
                    size="sm"
                  />
                  <button
                    onClick={() => openEditSheet(card)}
                    aria-label={`Edit ${card.name}`}
                    className="p-2 -m-1 rounded-lg"
                    style={{ color: "var(--md-sys-color-primary)" }}
                  >
                    <Pencil size={16} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile FAB */}
      <button
        data-tutorial-id="new-card-fab"
        onClick={openCreateSheet}
        className="fixed bottom-6 right-6 z-20 lg:hidden w-14 h-14 rounded-2xl flex items-center justify-center shadow-elevation-3"
        style={{
          background: "var(--md-sys-color-primary-container)",
          color: "var(--md-sys-color-on-primary-container)",
        }}
        aria-label="New card"
      >
        <Plus size={24} />
      </button>

      <CardEditSheet
        mode={editMode}
        card={editTarget ?? undefined}
        categories={categories}
        isOpen={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        onSaved={fetchCards}
        onError={setSnackbarMessage}
      />

      <M3Snackbar
        message={snackbarMessage}
        onDismiss={() => setSnackbarMessage(null)}
      />
    </div>
  );
}
