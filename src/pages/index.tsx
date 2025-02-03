import { useState, useEffect } from 'react';
import { title, subtitle } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

// Firebase Configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initalize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Card Collections
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

export default function IndexPage() {

    const [boosterPacks, setBoosterPacks] = useState<any[][]>([]);
    const [cardsData, setCardsData] = useState<{ [key: string]: any }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [numPacks, setNumPacks] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [exportTrigger, setExportTrigger] = useState(false);


    // Pull cards databse from Firebase
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data: { [key: string]: any } = {};
                for (const col of [...collections.map(c => c.id), 'spoonbill']) {
                    const querySnapshot = await getDocs(collection(db, col));
                    data[col] = querySnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter((card: { id: string; active?: boolean }) => card.active !== false); // Consider cards active if 'active' is true or null/undefined
                }
                setCardsData(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err);
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
        setShowModal(true);
    };

    // Generate boosterpack
    const generateBoosterPack = () => {
        const pack: any[] = [];
        const usedCards = new Set();

        const addCard = (collection: string) => {
            const availableCards = cardsData[collection].filter((card: { id: any; }) => !usedCards.has(`${collection}-${card.id}`));
            if (availableCards.length === 0) {
                console.warn(`No more available cards in ${collection} collection`);
                return false;
            }

            const card = availableCards[Math.floor(Math.random() * availableCards.length)];
            pack.push({ ...card, collection });
            usedCards.add(`${collection}-${card.id}`);
            return true;
        };

        for (const col of collections.slice(0, 4).map(c => c.id)) {
            if (!addCard(col) || !addCard(col)) {
                console.warn(`Not enough cards in ${col} collection`);
            }
        }

        let randomCollection;
        let attempts = 0;
        do {
            randomCollection = collections[Math.floor(Math.random() * (collections.length))].id;
            attempts++;
        } while (!addCard(randomCollection) && attempts < 10);

        if (attempts >= 10) {
            console.warn("Failed to add a card from a random collection after 10 attempts");
        }

        if (!addCard('spoonbill')) {
            console.warn('Not enough cards in spoonbill collection');
        }

        return pack;
    };

    // MORE PACKS (multiple packs)
    const generatePacks = (count: number) => {
        try {
            const newPacks = [];
            for (let i = 0; i < count; i++) {
                newPacks.push(generateBoosterPack());
            }
            setBoosterPacks(newPacks);
        } catch (err) {
            console.error("Error generating packs:", err);
            setError("Failed to generate booster packs. Please try again.");
        }
    };

    // Used when generating multiple packs, checks to see if there are duplicates

    // Function to generate packs and export
    const handleGenerateAndExport = () => {
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

        // Construct sheet data
        const sheetData = boosterPacks.map((pack, index) => {
            const row: { [key: string]: any } = { "Pack #": index + 1 };

            const collections = [
                "africansavanna", "californiatrail",
                "childrenszoo", "tropicalrainforest",
            ];

            collections.forEach((collection) => {
                const cards = pack.filter((card: { collection: string; }) => card.collection === collection);
                row[`${getCollectionName(collection)} 1`] = cards[0] ? `#${cards[0].number} - ${cards[0].name}` : "";
                row[`${getCollectionName(collection)} 2`] = cards[1] ? `#${cards[1].number} - ${cards[1].name}` : "";
            });

            const allCollections = [
                "africansavanna", "californiatrail", "childrenszoo", "tropicalrainforest",
                "specialedition", "booatthezoo", "arcas", "newnaturefoundation", "disney"
            ];

            const wildcard = pack.find((card: { collection: string; }) => allCollections.includes(card.collection));
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
        const collection = collections.find(c => c.id === id);
        return collection ? collection.name : 'Spoonbill';
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
