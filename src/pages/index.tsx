import { useState, useEffect } from 'react';
import { title, subtitle } from "@/components/primitives";
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
import React from 'react';
import { utils, writeFile } from 'xlsx';
import { event, timing, exception } from '@/lib/gtag';
import { db } from '@/lib/firebase';
import { getCategories, categoriesToLegacyFormat } from '@/utils/categories';

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

export default function IndexPage() {

    const [boosterPacks, setBoosterPacks] = useState<any[][]>([]);
    const [cardsData, setCardsData] = useState<{ [key: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [numPacks, setNumPacks] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [exportTrigger, setExportTrigger] = useState(false);
    const [collections, setCollections] = useState<LegacyCollection[]>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set([]));


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
            const newPacks = [];
            for (let i = 0; i < count; i++) {
                newPacks.push(generateBoosterPack());
            }
            setBoosterPacks(newPacks);
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

    // Used when generating multiple packs, checks to see if there are duplicates

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

    return (
        <DefaultLayout>
            <section className="flex flex-col items-center justify-center py-8 md:py-10">
                <div className="inline-block max-w-lg text-center justify-center">
                    <h1 className={title()}>Welcome!</h1>
                    <h2 className={subtitle()}>Select an option below to get started!</h2>
                </div>
                <div className="flex flex-col items-center justify-center gap-4 py-4 md:py-8">
                    <div className="flex flex-col sm:flex-row inline-block max-w-lg text-center justify-center gap-4">
                        <Button
                            isLoading={loading}
                            variant='flat'
                            color='success'
                            onPress={() => generatePacks(1)}
                            size='lg'
                        >
                            Generate Booster Pack
                        </Button>
                        <Button
                            isLoading={loading}
                            variant='flat' color='secondary'
                            onPress={handleOpenModal}
                            size='lg'
                        >
                            Create a Spreadsheet
                        </Button>
                    </div>
                </div>
            </section>

            <section>
                {loading ? (
                    <Skeleton className='rounded-lg'>
                        <div className="min-h-[400px]" />
                    </Skeleton>
                ) : error ? (
                    <div className="text-red-500">{error}</div>
                ) : (
                    <Table
                        aria-label="Booster Pack Table"
                        color={"success"}
                        selectionMode='multiple'
                        selectedKeys={selectedKeys}
                        onSelectionChange={(keys) => setSelectedKeys(keys as Set<string>)}
                        classNames={{
                            table: "min-h-[400px]",
                        }}
                    >
                        <TableHeader>
                            <TableColumn key="collection">Collection</TableColumn>
                            <TableColumn key="name">Name</TableColumn>
                            <TableColumn key="number">Number</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent="Nothing to display here! Generate a pack?">
                            {boosterPacks.map((pack, packIndex) => (
                                <React.Fragment key={packIndex}>
                                    {pack.map((card, cardIndex) => (
                                        <TableRow key={`${packIndex}-${cardIndex}`}>
                                            <TableCell>{getCollectionName(card.collection)}</TableCell>
                                            <TableCell>{card.name}</TableCell>
                                            <TableCell>{card.number}</TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>

                    </Table>
                )}
            </section>

            {/* Modal for user input */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
                <ModalContent>
                    <ModalHeader>Generate Booster Packs</ModalHeader>
                    <ModalBody>
                        <p>Enter the number of booster packs you would like to generate:</p>
                        <Input
                            type="number"
                            min="1"
                            value={numPacks.toString()}
                            onChange={(e) => setNumPacks(Number(e.target.value))}
                            placeholder="Enter number of packs"
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="flat" color="danger" onPress={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="flat"
                            color="success"
                            isLoading={isExporting} // Button shows loading state
                            onPress={handleGenerateAndExport}
                        >
                            Generate & Export
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </DefaultLayout>
    );
}
