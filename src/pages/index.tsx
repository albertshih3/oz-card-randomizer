import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import DefaultLayout from "@/layouts/default";
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@heroui/button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Input } from "@heroui/input";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell
} from "@heroui/table";
import { Skeleton } from '@heroui/skeleton';
import { utils, writeFile } from 'xlsx';
import { event, timing, exception } from '@/lib/gtag';
import { db } from '@/lib/firebase';
import { getCategories, categoriesToLegacyFormat } from '@/utils/categories';
import { Sparkles, FileSpreadsheet, PackageOpen, ChevronDown, History, Clock } from 'lucide-react';
import { CollectionBadge } from "@/components/collection-badge";

// Required base categories (order matters for pack generation)
const BASE_CATEGORIES: string[] = [
    'tropicalrainforest',
    'childrenszoo',
    'californiatrail',
    'africansavanna',
];

const BASE_NAME_MAP: Record<string, string> = {
    tropicalrainforest: 'Tropical Rainforest',
    childrenszoo: "Children's Zoo",
    californiatrail: 'California Trail',
    africansavanna: 'African Savanna',
};

// We'll load card categories dynamically
type LegacyCollection = { id: string; name: string; isWildcardEligible?: boolean };

type PackHistoryItem = {
    id: string;
    timestamp: Date;
    cards: any[];
};

export default function IndexPage() {

    const [boosterPacks, setBoosterPacks] = useState<any[][]>([]); // Keeps track of current generation for export
    const [packHistory, setPackHistory] = useState<PackHistoryItem[]>([]); // Keeps track of last 10 packs for display
    const [expandedPackId, setExpandedPackId] = useState<string | null>(null);
    const [cardsData, setCardsData] = useState<{ [key: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [numPacks, setNumPacks] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [exportTrigger, setExportTrigger] = useState(false);
    const [collections, setCollections] = useState<LegacyCollection[]>([]);

    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));
    const [lastGenTime, setLastGenTime] = useState<Date | null>(null);

    // Pull categories and cards database from Firebase
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Load categories from Firestore, convert to legacy format (id = collection name)
                const categories = await getCategories();
                const legacyCollections = categoriesToLegacyFormat(categories);
                setCollections(legacyCollections);

                const data: { [key: string]: any } = {};
                // Ensure we always include base categories, even if not listed in Firestore categories
                const categoryIds = Array.from(new Set([
                    ...legacyCollections.map(c => c.id),
                    ...BASE_CATEGORIES,
                    'spoonbill',
                ]));
                for (const col of categoryIds) {
                    const querySnapshot = await getDocs(collection(db, col));
                    data[col] = querySnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter((card: { id: string; active?: boolean }) => card.active !== false); // Consider cards active if 'active' is true or null/undefined
                }
                setCardsData(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err);
                exception({
                    description: `Failed to load card data: ${err}`,
                    fatal: false
                });
                setError("Failed to load card data. Please try again later.");
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Export when packs generated (spreadsheet)
    useEffect(() => {
        if (exportTrigger && boosterPacks.length > 0) {
            exportToExcel(boosterPacks);
            setIsExporting(false);  // Stop loading after export
            setExportTrigger(false); // Reset trigger
        }
    }, [boosterPacks, exportTrigger]);

    // open modal function
    const handleOpenModal = () => {
        event({
            action: 'click',
            category: 'engagement',
            label: 'open_spreadsheet_modal'
        });
        setShowModal(true);
    };

    // Generate boosterpack
    const generateBoosterPack = () => {
        const startTime = performance.now();
        event({
            action: 'generate',
            category: 'booster_pack',
            label: 'single_pack'
        });
        const pack: any[] = [];
        const usedCards = new Set();

        const addCard = (collection: string) => {
            const source = Array.isArray(cardsData[collection]) ? cardsData[collection] : [];
            const availableCards = source.filter((card: { id: any; }) => !usedCards.has(`${collection}-${card.id}`));
            if (availableCards.length === 0) {
                console.warn(`No more available cards in ${collection} collection`);
                return false;
            }

            const card = availableCards[Math.floor(Math.random() * availableCards.length)];
            pack.push({ ...card, collection });
            usedCards.add(`${collection}-${card.id}`);
            return true;
        };

        // First 8 cards: two from each of the specified 4 categories (order matters)
        for (const col of BASE_CATEGORIES) {
            if (!addCard(col) || !addCard(col)) {
                console.warn(`Not enough cards in ${col} collection`);
            }
        }

        // 9th card: from specific wildcard categories
        const eligibleCategories = Object.keys(cardsData)
            .filter(id => {
                const collection = collections.find(c => c.id === id);
                return collection?.isWildcardEligible && Array.isArray(cardsData[id]) && cardsData[id].length > 0;
            });

        let randomCollection: string | undefined;
        let attempts = 0;
        const maxAttempts = Math.max(10, eligibleCategories.length * 2);
        while (attempts < maxAttempts) {
            randomCollection = eligibleCategories[Math.floor(Math.random() * eligibleCategories.length)];
            if (addCard(randomCollection)) break;
            attempts++;
        }

        if (attempts >= maxAttempts) {
            console.warn("Failed to add a card from a random collection after 10 attempts");
        }

        if (!addCard('spoonbill')) {
            console.warn('Not enough cards in spoonbill collection');
        }

        const endTime = performance.now();
        timing({
            name: 'pack_generation',
            value: Math.round(endTime - startTime),
            category: 'performance',
            label: 'single_pack'
        });

        return pack;
    };

    // MORE PACKS (multiple packs)
    const generatePacks = (count: number) => {
        try {
            event({
                action: 'generate',
                category: 'booster_pack',
                label: 'multiple_packs',
                value: count
            });

            // Archive current packs to history if they exist
            if (boosterPacks.length > 0) {
                const historyItems: PackHistoryItem[] = boosterPacks.map(pack => ({
                    id: crypto.randomUUID(),
                    timestamp: lastGenTime || new Date(), // Use lastGenTime for archived packs
                    cards: pack
                }));

                setPackHistory(prev => {
                    const updated = [...historyItems, ...prev].slice(0, 10);
                    return updated;
                });
            }

            const newPacks = [];
            for (let i = 0; i < count; i++) {
                newPacks.push(generateBoosterPack());
            }

            // Update current generation
            setBoosterPacks(newPacks);
            setLastGenTime(new Date());
            setSelectedKeys(new Set([]));

        } catch (err) {
            console.error("Error generating packs:", err);
            exception({
                description: `Failed to generate booster packs: ${err}`,
                fatal: false
            });
            setError("Failed to generate booster packs. Please try again.");
        }
    };

    // Function to generate packs and export
    const handleGenerateAndExport = () => {
        event({
            action: 'export',
            category: 'spreadsheet',
            label: 'generate_and_export',
            value: numPacks
        });
        setIsExporting(true); // Start loading state
        generatePacks(numPacks);
        setExportTrigger(true); // Signal to trigger export when packs are ready
        setShowModal(false); // Close the modal
    };

    // Function to export booster packs to Excel
    const exportToExcel = (boosterPacks: any[]) => {
        if (!boosterPacks.length) {
            console.warn("No data to export");
            return;
        }

        event({
            action: 'download',
            category: 'export',
            label: 'excel_export',
            value: boosterPacks.length
        });

        // Construct sheet data
        const sheetData = boosterPacks.map((pack, index) => {
            const row: { [key: string]: any } = { "Pack #": index + 1 };

            // Use the same required base categories in the specified order for export columns
            BASE_CATEGORIES.forEach((collection) => {
                const cards = pack.filter((card: { collection: string; }) => card.collection === collection);
                row[`${getCollectionName(collection)} 1`] = cards[0] ? `#${cards[0].number} - ${cards[0].name}` : "";
                row[`${getCollectionName(collection)} 2`] = cards[1] ? `#${cards[1].number} - ${cards[1].name}` : "";
            });


            const wildcard = pack[8];
            row["Wildcard"] = wildcard ? `#${wildcard.number} - ${wildcard.name}` : "";

            const spoonbill = pack.find((card: { collection: string; }) => card.collection === "spoonbill");
            row["Spoonbill"] = spoonbill ? `#${spoonbill.number} - ${spoonbill.name}` : "";

            return row;
        });

        // Create worksheet and workbook
        const ws = utils.json_to_sheet(sheetData);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Booster Packs");

        // Export file
        writeFile(wb, "BoosterPacks.xlsx");
    };

    const getCollectionName = (id: string) => {
        if (id === 'spoonbill') return 'Spoonbill';
        const c = collections.find(c => c.id === id);
        if (c) return c.name;
        if (BASE_NAME_MAP[id]) return BASE_NAME_MAP[id];
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
                            color="primary"
                            variant="shadow"
                            onPress={() => generatePacks(1)}
                            size="lg"
                            className="font-semibold w-full sm:w-auto"
                            startContent={!loading && <PackageOpen className="w-5 h-5" />}
                        >
                            Generate Pack
                        </Button>
                        <Button
                            isLoading={loading}
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
                                onSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
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
                                <TableBody emptyContent={
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Sparkles className="w-12 h-12 mb-4 text-default-300" />
                                        <p className="text-lg font-medium">No packs generated yet</p>
                                        <p className="text-sm">Click "Generate Pack" to get started</p>
                                    </div>
                                }>
                                    {boosterPacks.map((pack, packIndex) => (
                                        pack.map((card, cardIndex) => (
                                            <TableRow key={`${packIndex}-${cardIndex}-${card.id}`}>
                                                <TableCell>
                                                    <CollectionBadge
                                                        collection={card.collection}
                                                        name={getCollectionName(card.collection)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{card.name}</TableCell>
                                                <TableCell className="text-muted-foreground">#{card.number}</TableCell>
                                            </TableRow>
                                        ))
                                    )).flat()}
                                </TableBody>
                            </Table>
                        </motion.div>

                        {/* History Section */}
                        {packHistory.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-xl font-bold text-foreground/80">
                                    <History className="w-5 h-5" />
                                    <h2>Pack History (Last 10)</h2>
                                </div>

                                <div className="space-y-4">
                                    {packHistory.map((packItem, index) => (
                                        <motion.div
                                            key={packItem.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`border rounded-xl overflow-hidden transition-all duration-200 ${expandedPackId === packItem.id
                                                ? "border-primary/50 shadow-lg bg-card"
                                                : "border-border hover:border-primary/30 bg-card/50"
                                                }`}
                                        >
                                            <button
                                                onClick={() => togglePackExpansion(packItem.id)}
                                                className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                        }`}>
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
                                                    className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${expandedPackId === packItem.id ? "rotate-180" : ""
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
                                                                        <TableRow key={`${packItem.id}-${cardIndex}`}>
                                                                            <TableCell>
                                                                                <CollectionBadge
                                                                                    collection={card.collection}
                                                                                    name={getCollectionName(card.collection)}
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="font-medium">{card.name}</TableCell>
                                                                            <TableCell className="text-muted-foreground">#{card.number}</TableCell>
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
                        <p className="text-sm text-muted-foreground font-normal">Create multiple packs and export to Excel</p>
                    </ModalHeader>
                    <ModalBody className="py-6">
                        <Input
                            type="number"
                            label="Number of Packs"
                            placeholder="e.g. 50"
                            min="1"
                            max="1000"
                            value={numPacks.toString()}
                            onChange={(e) => setNumPacks(Number(e.target.value))}
                            variant="bordered"
                            description="How many booster packs do you want to generate?"
                            startContent={<PackageOpen className="w-4 h-4 text-muted-foreground" />}
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" color="danger" onPress={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="primary"
                            isLoading={isExporting}
                            onPress={handleGenerateAndExport}
                            startContent={!isExporting && <FileSpreadsheet className="w-4 h-4" />}
                        >
                            Generate & Export
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </DefaultLayout>
    );
}
