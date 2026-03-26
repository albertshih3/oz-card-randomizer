import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DefaultLayout from "@/layouts/default";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@heroui/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Skeleton } from "@heroui/skeleton";
import { event, exception } from "@/lib/gtag";
import { db } from "@/lib/firebase";
import { getCategories, categoriesToLegacyFormat } from "@/utils/categories";
import {
  BASE_COLLECTION_IDS,
  COLLECTION_IDS,
  COLLECTION_DISPLAY_NAMES,
} from "@/constants/collections";
import {
  MAX_PACKS_PER_EXPORT,
  PACK_HISTORY_LIMIT,
} from "@/constants/generation";
import {
  Sparkles,
  FileSpreadsheet,
  PackageOpen,
  ChevronDown,
  History,
  Clock,
} from "lucide-react";
import { CollectionBadge } from "@/components/collection-badge";
import { M3Spinner } from "@/components/m3/spinner";
import { useBoosterPackGeneration } from "@/hooks/use-booster-pack-generation";
import { useExcelExport } from "@/hooks/use-excel-export";
import type { Card, Collection } from "@/types/index";

export default function IndexPage() {
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);
  const [cardsData, setCardsData] = useState<{ [key: string]: Card[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [numPacks, setNumPacks] = useState(1);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));

  const { boosterPacks, packHistory, lastGenTime, generatePacks } =
    useBoosterPackGeneration(cardsData, collections);
  const { exportToExcel, isExporting } = useExcelExport();

  // Pull categories and cards database from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Load categories from Firestore, convert to legacy format (id = collection name)
        const categories = await getCategories();
        const legacyCollections = categoriesToLegacyFormat(categories);
        setCollections(legacyCollections);

        const data: { [key: string]: Card[] } = {};
        // Ensure we always include base categories, even if not listed in Firestore categories
        const categoryIds = Array.from(
          new Set([
            ...legacyCollections.map((c) => c.id),
            ...BASE_COLLECTION_IDS,
            COLLECTION_IDS.SPOONBILL,
          ]),
        );
        for (const col of categoryIds) {
          const querySnapshot = await getDocs(collection(db, col));
          data[col] = querySnapshot.docs
            .map(
              (doc) => ({ id: doc.id, collection: col, ...doc.data() }) as Card,
            )
            .filter((card) => card.active !== false); // Consider cards active if 'active' is true or null/undefined
        }
        setCardsData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        exception({
          description: `Failed to load card data: ${err}`,
          fatal: false,
        });
        setError("Failed to load card data. Please try again later.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // open modal function
  const handleOpenModal = () => {
    event({
      action: "click",
      category: "engagement",
      label: "open_spreadsheet_modal",
    });
    setShowModal(true);
  };

  // Function to generate packs and export
  const handleGenerateAndExport = async () => {
    if (isExporting) return;
    if (!numPacks || numPacks < 1) return;
    event({
      action: "export",
      category: "spreadsheet",
      label: "generate_and_export",
      value: numPacks,
    });
    try {
      const packs = generatePacks(numPacks);
      setSelectedKeys(new Set([]));
      if (packs.length > 0) {
        await exportToExcel(packs);
      }
    } finally {
      setShowModal(false);
    }
  };

  const getCollectionName = (id: string) => {
    const c = collections.find((c) => c.id === id);
    if (c) return c.name;
    if (COLLECTION_DISPLAY_NAMES[id]) return COLLECTION_DISPLAY_NAMES[id];
    return id;
  };

  const togglePackExpansion = (id: string) => {
    setExpandedPackId(expandedPackId === id ? null : id);
  };

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center py-3 md:py-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-block max-w-2xl text-center justify-center space-y-6"
        >
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
            Oakland Zoo <br />
            <span className="text-primary">Booster Pack Generator</span>
          </h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              isLoading={loading}
              spinner={<M3Spinner size="sm" color="currentColor" />}
              color="primary"
              variant="shadow"
              onPress={() => {
                generatePacks(1);
                setSelectedKeys(new Set([]));
              }}
              size="lg"
              className="font-semibold w-full sm:w-auto"
              startContent={!loading && <PackageOpen className="w-5 h-5" />}
            >
              Generate Pack
            </Button>
            <Button
              isLoading={loading}
              spinner={<M3Spinner size="sm" color="currentColor" />}
              variant="bordered"
              onPress={handleOpenModal}
              size="lg"
              className="font-semibold w-full sm:w-auto"
              startContent={!loading && <FileSpreadsheet className="w-5 h-5" />}
            >
              Export to Excel
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="max-w-5xl mx-auto pb-20 px-4 space-y-12">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="rounded-lg w-full h-[50px]" />
            <Skeleton className="rounded-lg w-full h-[400px]" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-danger/10 border border-danger/20 text-danger flex items-center justify-center">
            {error}
          </div>
        ) : (
          <>
            {/* Current Packs Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="text-xl font-bold">Current Pack(s)</h2>
                {lastGenTime && (
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Generated at {lastGenTime.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <Table
                aria-label="Booster Pack Table"
                removeWrapper
                color="primary"
                selectionMode="multiple"
                selectedKeys={selectedKeys}
                onSelectionChange={(keys) =>
                  setSelectedKeys(keys as Set<string>)
                }
                classNames={{
                  base: "max-h-[600px] overflow-scroll",
                  table: "min-h-[200px]",
                  th: "bg-muted/50 text-muted-foreground font-medium",
                  td: "py-3",
                }}
              >
                <TableHeader>
                  <TableColumn key="collection">COLLECTION</TableColumn>
                  <TableColumn key="name">NAME</TableColumn>
                  <TableColumn key="number">NUMBER</TableColumn>
                </TableHeader>
                <TableBody
                  emptyContent={
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Sparkles className="w-12 h-12 mb-4 text-default-300" />
                      <p className="text-lg font-medium">
                        No packs generated yet
                      </p>
                      <p className="text-sm">
                        Click &quot;Generate Pack&quot; to get started
                      </p>
                    </div>
                  }
                >
                  {boosterPacks
                    .map((pack, packIndex) =>
                      pack.map((card, cardIndex) => (
                        <TableRow key={`${packIndex}-${cardIndex}-${card.id}`}>
                          <TableCell>
                            <CollectionBadge
                              collection={card.collection}
                              name={getCollectionName(card.collection)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {card.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            #{card.number}
                          </TableCell>
                        </TableRow>
                      )),
                    )
                    .flat()}
                </TableBody>
              </Table>
            </motion.div>

            {/* History Section */}
            {packHistory.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-bold text-foreground/80">
                  <History className="w-5 h-5" />
                  <h2>Pack History (Last {PACK_HISTORY_LIMIT})</h2>
                </div>

                <div className="space-y-4">
                  {packHistory.map((packItem, index) => (
                    <motion.div
                      key={packItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                        expandedPackId === packItem.id
                          ? "border-primary/50 shadow-lg bg-card"
                          : "border-border hover:border-primary/30 bg-card/50"
                      }`}
                    >
                      <button
                        onClick={() => togglePackExpansion(packItem.id)}
                        className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              index === 0
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <PackageOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              Booster Pack
                            </h3>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              {packItem.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                            expandedPackId === packItem.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {expandedPackId === packItem.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="border-t border-border/50">
                              <Table
                                aria-label="Booster Pack Table"
                                removeWrapper
                                color="primary"
                                classNames={{
                                  base: "max-h-[500px] overflow-scroll",
                                  th: "bg-muted/50 text-muted-foreground font-medium",
                                  td: "py-3",
                                }}
                              >
                                <TableHeader>
                                  <TableColumn>COLLECTION</TableColumn>
                                  <TableColumn>NAME</TableColumn>
                                  <TableColumn>NUMBER</TableColumn>
                                </TableHeader>
                                <TableBody>
                                  {packItem.cards.map((card, cardIndex) => (
                                    <TableRow
                                      key={`${packItem.id}-${cardIndex}`}
                                    >
                                      <TableCell>
                                        <CollectionBadge
                                          collection={card.collection}
                                          name={getCollectionName(
                                            card.collection,
                                          )}
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {card.name}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        #{card.number}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Modal for user input */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        backdrop="blur"
        classNames={{
          base: "bg-card border border-border shadow-xl",
          header: "border-b border-border",
          footer: "border-t border-border",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-xl font-bold">Generate Spreadsheet</h3>
            <p className="text-sm text-muted-foreground font-normal">
              Create multiple packs and export to Excel
            </p>
          </ModalHeader>
          <ModalBody className="py-6">
            <Input
              type="number"
              label="Number of Packs"
              placeholder="e.g. 50"
              min="1"
              max={MAX_PACKS_PER_EXPORT.toString()}
              value={numPacks.toString()}
              onChange={(e) => setNumPacks(Number(e.target.value))}
              variant="bordered"
              description="How many booster packs do you want to generate?"
              startContent={
                <PackageOpen className="w-4 h-4 text-muted-foreground" />
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              color="danger"
              onPress={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={isExporting}
              spinner={<M3Spinner size="sm" color="currentColor" />}
              onPress={handleGenerateAndExport}
              startContent={
                !isExporting && <FileSpreadsheet className="w-4 h-4" />
              }
            >
              Generate & Export
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
}
