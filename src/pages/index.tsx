import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import DefaultLayout from "@/layouts/default";
import { collection, getDocs } from "firebase/firestore";
import { M3Button } from "@/components/m3/button";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
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
  RotateCcw,
  ClipboardList,
  CircleCheck,
  Check,
} from "lucide-react";
import { CollectionBadge } from "@/components/collection-badge";
import { M3Spinner } from "@/components/m3/spinner";
import { useBoosterPackGeneration } from "@/hooks/use-booster-pack-generation";
import { useExcelExport } from "@/hooks/use-excel-export";
import type { Card, Collection } from "@/types/index";

const M3_STANDARD_EASING: [number, number, number, number] = [0.2, 0, 0, 1];

const getPackCardKey = (card: Card, cardIndex: number) =>
  `${cardIndex}-${card.collection}-${card.id}`;

export default function IndexPage() {
  const [expandedPackId, setExpandedPackId] = useState<string | null>(null);
  const [cardsData, setCardsData] = useState<{ [key: string]: Card[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [numPacks, setNumPacks] = useState(1);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [completedCardKeys, setCompletedCardKeys] = useState<Set<string>>(
    new Set(),
  );
  const shouldReduceMotion = useReducedMotion();

  const { boosterPacks, packHistory, lastGenTime, generatePacks } =
    useBoosterPackGeneration(cardsData, collections);
  const { exportToExcel, isExporting } = useExcelExport();
  const currentPack = boosterPacks[0] ?? [];
  const hasCurrentPack = currentPack.length > 0;
  const currentPackSignature = currentPack
    .map((card, index) => getPackCardKey(card, index))
    .join("|");
  const completedCount = completedCardKeys.size;
  const isCurrentPackComplete =
    hasCurrentPack && completedCount === currentPack.length;

  const entrance = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 },
  };

  const handleGenerateSinglePack = () => {
    setCompletedCardKeys(new Set());
    generatePacks(1);
  };

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

  useEffect(() => {
    setCompletedCardKeys(new Set());
  }, [currentPackSignature]);

  // open modal function
  const handleOpenModal = () => {
    event("select_content", {
      content_type: "button",
      item_id: "open_spreadsheet_modal",
    });
    setShowModal(true);
  };

  // Function to generate packs and export
  const handleGenerateAndExport = async () => {
    if (isExporting) return;
    if (!numPacks || numPacks < 1) return;
    try {
      const packs = generatePacks(numPacks);
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

  const toggleCardCompleted = (key: string) => {
    setCompletedCardKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <DefaultLayout>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 pb-28 pt-4 sm:px-4 md:pb-16 md:pt-8">
        <motion.div
          initial={entrance.initial}
          animate={entrance.animate}
          transition={{ duration: 0.42, ease: [0.2, 0, 0, 1] }}
          className="flex flex-col gap-4 rounded-[28px] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-5 shadow-sm sm:p-6 md:flex-row md:items-end md:justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-label-large text-[var(--md-sys-color-primary)]">
              <ClipboardList className="h-4 w-4" />
              Oakland Zoo Booster Pack Generator
            </div>
            <h1 className="text-headline-large text-[var(--md-sys-color-on-surface)]">
              Generate a pack
            </h1>
            <p className="max-w-xl text-body-large text-[var(--md-sys-color-on-surface-variant)]">
              Click on the &ldquo;generate pack&rdquo; button to generate a
              booster pack. Each pack should contain 10 cards. Two from each
              section of the zoo, one wildcard, and one spoonbill.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:min-w-[340px]">
            <M3Button
              variant="filled"
              isLoading={loading}
              spinner={<M3Spinner size="sm" color="currentColor" />}
              onPress={() => {
                handleGenerateSinglePack();
              }}
              size="lg"
              className="min-h-14 w-full"
              startContent={!loading && <PackageOpen className="w-5 h-5" />}
            >
              Generate pack
            </M3Button>
            <M3Button
              variant="outlined"
              isLoading={loading}
              spinner={<M3Spinner size="sm" color="currentColor" />}
              onPress={handleOpenModal}
              size="lg"
              className="min-h-14 w-full"
              startContent={!loading && <FileSpreadsheet className="w-5 h-5" />}
            >
              Export packs
            </M3Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-3 rounded-[28px] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-3xl" />
          </div>
        ) : error ? (
          <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--md-sys-color-error)] bg-[var(--md-sys-color-error-container)] p-5 text-[var(--md-sys-color-on-error-container)]">
            <p className="text-title-medium">Card data did not load</p>
            <p className="text-body-medium">{error}</p>
            <M3Button
              variant="outlined"
              color="error"
              className="w-fit"
              onPress={() => window.location.reload()}
            >
              Try again
            </M3Button>
          </div>
        ) : (
          <>
            <div className="rounded-[28px] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-title-large text-[var(--md-sys-color-on-surface)]">
                    Current Booster Pack
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-body-medium text-[var(--md-sys-color-on-surface-variant)]">
                    {hasCurrentPack ? (
                      <>
                        <CircleCheck className="h-4 w-4 text-[var(--md-sys-color-primary)]" />
                        <span>
                          {completedCount} of {currentPack.length} pulled
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-[var(--md-sys-color-primary)]" />
                        <span>Waiting for the first pack</span>
                      </>
                    )}
                  </div>
                </div>
                {lastGenTime && (
                  <span className="hidden items-center gap-1 text-label-medium text-[var(--md-sys-color-on-surface-variant)] sm:flex">
                    <Clock className="h-3.5 w-3.5" />
                    {lastGenTime.toLocaleTimeString()}
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {hasCurrentPack ? (
                  <motion.ol
                    key="generated-pack"
                    {...entrance}
                    transition={{ duration: 0.3, ease: M3_STANDARD_EASING }}
                    className="grid gap-3"
                  >
                    {currentPack.map((card, cardIndex) => (
                      <PackCardRow
                        key={getPackCardKey(card, cardIndex)}
                        card={card}
                        cardIndex={cardIndex}
                        collectionName={getCollectionName(card.collection)}
                        isCompleted={completedCardKeys.has(
                          getPackCardKey(card, cardIndex),
                        )}
                        shouldReduceMotion={shouldReduceMotion}
                        onToggle={toggleCardCompleted}
                      />
                    ))}
                  </motion.ol>
                ) : (
                  <motion.div
                    key="empty-pack"
                    {...entrance}
                    transition={{ duration: 0.3, ease: M3_STANDARD_EASING }}
                    className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl bg-[var(--md-sys-color-primary-container)]/45 px-5 py-10 text-center"
                  >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-primary)] shadow-sm">
                      <PackageOpen className="h-8 w-8" />
                    </div>
                    <p className="text-title-medium text-[var(--md-sys-color-on-surface)]">
                      Tap generate when you&apos;re ready.
                    </p>
                    <p className="mt-2 max-w-sm text-body-medium text-[var(--md-sys-color-on-surface-variant)]">
                      The next screen will turn into a numbered pull list for
                      the ten cards.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {hasCurrentPack && (
              <MobilePackAction
                isComplete={isCurrentPackComplete}
                shouldReduceMotion={shouldReduceMotion}
                onGenerate={handleGenerateSinglePack}
              />
            )}

            {/* History Section */}
            {packHistory.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-title-medium text-[var(--md-sys-color-on-surface-variant)]">
                  <History className="h-5 w-5" />
                  <h2>Pack History (Last {PACK_HISTORY_LIMIT})</h2>
                </div>

                <div className="space-y-3">
                  {packHistory.map((packItem, index) => (
                    <motion.div
                      key={packItem.id}
                      initial={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: 10 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      className={`overflow-hidden rounded-3xl border transition-all duration-200 ${
                        expandedPackId === packItem.id
                          ? "border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface)] shadow-sm"
                          : "border-[var(--md-sys-color-outline-variant)] bg-transparent hover:border-[var(--md-sys-color-primary)]"
                      }`}
                    >
                      <button
                        onClick={() => togglePackExpansion(packItem.id)}
                        className="flex min-h-16 w-full items-center justify-between p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                              index === 0
                                ? "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
                                : "bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)]"
                            }`}
                          >
                            <PackageOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-title-medium text-[var(--md-sys-color-on-surface)]">
                              Booster Pack
                            </h3>
                            <div className="flex items-center gap-1 text-label-medium text-[var(--md-sys-color-on-surface-variant)]">
                              <Clock className="h-3 w-3" />
                              {packItem.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-[var(--md-sys-color-on-surface-variant)] transition-transform duration-300 ${
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
                            <ol className="grid gap-2 border-t border-[var(--md-sys-color-outline-variant)] p-3">
                              {packItem.cards.map((card, cardIndex) => (
                                <li
                                  key={`${packItem.id}-${cardIndex}`}
                                  className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl px-2 py-2"
                                >
                                  <span className="text-label-large text-[var(--md-sys-color-on-surface-variant)]">
                                    {cardIndex + 1}
                                  </span>
                                  <span className="min-w-0 break-words text-body-medium text-[var(--md-sys-color-on-surface)]">
                                    {card.name}
                                  </span>
                                  <span className="text-label-large text-[var(--md-sys-color-on-surface-variant)]">
                                    #{card.number}
                                  </span>
                                </li>
                              ))}
                            </ol>
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
            <h3 className="text-title-large">Generate spreadsheet</h3>
            <p className="text-body-medium text-[var(--md-sys-color-on-surface-variant)]">
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
            <M3Button
              variant="tonal"
              color="error"
              onPress={() => setShowModal(false)}
            >
              Cancel
            </M3Button>
            <M3Button
              variant="filled"
              isLoading={isExporting}
              spinner={<M3Spinner size="sm" color="currentColor" />}
              onPress={handleGenerateAndExport}
              startContent={
                !isExporting && <FileSpreadsheet className="w-4 h-4" />
              }
            >
              Generate & Export
            </M3Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DefaultLayout>
  );
}

interface PackCardRowProps {
  card: Card;
  cardIndex: number;
  collectionName: string;
  isCompleted: boolean;
  shouldReduceMotion: boolean | null;
  onToggle: (key: string) => void;
}

function PackCardRow({
  card,
  cardIndex,
  collectionName,
  isCompleted,
  shouldReduceMotion,
  onToggle,
}: PackCardRowProps) {
  const cardKey = getPackCardKey(card, cardIndex);

  return (
    <motion.li
      initial={
        shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.22,
        delay: shouldReduceMotion ? 0 : cardIndex * 0.025,
        ease: M3_STANDARD_EASING,
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={`Mark ${card.name} ${isCompleted ? "incomplete" : "complete"}`}
        onClick={() => onToggle(cardKey)}
        className={`grid min-h-[88px] w-full grid-cols-[4rem_minmax(0,1fr)_4.5rem] items-stretch gap-3 rounded-3xl p-3 text-left ring-1 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)] ${
          isCompleted
            ? "bg-[var(--md-sys-color-primary-container)]/35 ring-[var(--md-sys-color-primary)]/30"
            : "bg-[var(--md-sys-color-surface-container-lowest,#ffffff)] ring-[var(--md-sys-color-outline-variant)]"
        }`}
      >
        <div
          className={`flex min-h-16 w-full self-stretch items-center justify-center rounded-3xl text-title-medium transition-colors ${
            isCompleted
              ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
              : "bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
          }`}
        >
          {isCompleted ? <Check className="h-5 w-5" /> : cardIndex + 1}
        </div>
        <div className="min-w-0 py-0.5">
          <p
            className={`break-words text-title-medium leading-6 text-[var(--md-sys-color-on-surface)] transition-all ${
              isCompleted ? "line-through opacity-60" : ""
            }`}
          >
            {card.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CollectionBadge
              collection={card.collection}
              name={collectionName}
              className="max-w-full"
            />
          </div>
        </div>
        <div
          className={`flex min-h-16 w-full self-stretch items-center justify-center rounded-3xl px-3 text-title-medium transition-colors ${
            isCompleted
              ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
              : "bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface)]"
          }`}
        >
          #{card.number}
        </div>
      </button>
    </motion.li>
  );
}

interface MobilePackActionProps {
  isComplete: boolean;
  shouldReduceMotion: boolean | null;
  onGenerate: () => void;
}

function MobilePackAction({
  isComplete,
  shouldReduceMotion,
  onGenerate,
}: MobilePackActionProps) {
  const motionState = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.92 };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 py-3 md:hidden ${
        isComplete
          ? "border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]/95 shadow-[0_-8px_24px_rgba(16,47,84,0.12)] backdrop-blur"
          : "pointer-events-none"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isComplete ? (
          <motion.div
            key="full-generate-another"
            initial={motionState}
            animate={{ opacity: 1, scale: 1 }}
            exit={motionState}
            transition={{ duration: 0.2, ease: M3_STANDARD_EASING }}
            className="w-full"
          >
            <M3Button
              variant="filled"
              size="lg"
              className="min-h-14 w-full"
              onPress={onGenerate}
              startContent={<RotateCcw className="h-5 w-5" />}
            >
              Generate another
            </M3Button>
          </motion.div>
        ) : (
          <motion.div
            key="compact-generate-another"
            initial={motionState}
            animate={{ opacity: 1, scale: 1 }}
            exit={motionState}
            transition={{ duration: 0.2, ease: M3_STANDARD_EASING }}
          >
            <M3Button
              variant="filled"
              size="sm"
              className="pointer-events-auto h-10 px-4 shadow-lg"
              onPress={onGenerate}
              startContent={<RotateCcw className="h-4 w-4" />}
            >
              Regenerate
            </M3Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
