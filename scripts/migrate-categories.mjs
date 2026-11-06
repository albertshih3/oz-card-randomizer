#!/usr/bin/env node
// Moves category metadata to one document per category, keyed by category ID.
// Required before deploying firestore.rules, which look categories up by ID.
//
// Production has auto-generated document IDs and several duplicates per
// category. The app uses the first document per name in document ID order, so
// that document's values are kept: live behavior does not change. Card
// collections are never written to.
//
// The preview counts the cards in every collection. A collection with no category
// would become unreadable once the new rules deploy, so --apply stops until it is
// resolved: add a category for it, or pass --allow-unlisted to accept that.
//
//   FIREBASE_SERVICE_ACCOUNT_JSON=$(base64 -i key.json | tr -d '\n') \
//     node scripts/migrate-categories.mjs                # preview
//   ...same, with --apply to write
import fs from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const REQUIRED = [
  ["tropicalrainforest", "Tropical Rainforest"],
  ["childrenszoo", "Children's Zoo"],
  ["californiatrail", "California Trail"],
  ["africansavanna", "African Savanna"],
  ["spoonbill", "Spoonbill"],
];

const apply = process.argv.includes("--apply");
const allowUnlisted = process.argv.includes("--allow-unlisted");
/** Holds app data rather than cards, so it needs no category. */
const INTERNAL_COLLECTIONS = new Set(["categories", "rateLimits"]);
const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!encoded) {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  process.exit(1);
}

initializeApp({
  credential: cert(JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))),
});
const db = getFirestore();
const snapshot = await db.collection("categories").orderBy("__name__").get();

const backup = `categories-backup-${Date.now()}.json`;
const originals = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));

const canonical = new Map();
for (const { id, data } of originals) {
  const name = data.name || id;
  if (!canonical.has(name)) {
    canonical.set(name, {
      name,
      displayName: data.displayName || name,
      isWildcardEligible: data.isWildcardEligible === true,
    });
  }
}
for (const [name, displayName] of REQUIRED) {
  if (!canonical.has(name)) {
    canonical.set(name, { name, displayName, isWildcardEligible: false });
  }
}

const removals = originals.filter(({ id }) => !canonical.has(id));
const writes = [...canonical.values()];

console.log(`Documents now: ${originals.length}. After: ${writes.length}.`);
for (const entry of writes) {
  console.log(
    `  keep ${entry.name} "${entry.displayName}" wildcard=${entry.isWildcardEligible}`,
  );
}
console.log(`  remove ${removals.length} superseded documents`);

const countCards = async () => {
  const counts = new Map();
  for (const ref of await db.listCollections()) {
    if (INTERNAL_COLLECTIONS.has(ref.id)) continue;
    counts.set(ref.id, (await ref.count().get()).data().count);
  }
  return counts;
};

const cardsBefore = await countCards();
const listed = [...canonical.keys()];
const unlisted = [...cardsBefore.keys()].filter((id) => !canonical.has(id));
const total = (counts) => [...counts.values()].reduce((a, b) => a + b, 0);

console.log(`\nCards found: ${total(cardsBefore)}`);
for (const id of listed) {
  console.log(`  ${id}: ${cardsBefore.get(id) ?? 0}`);
}

if (unlisted.length > 0) {
  console.log("\nWARNING: collections with no category:");
  for (const id of unlisted) {
    console.log(`  ${id}: ${cardsBefore.get(id)} documents`);
  }
  console.log(
    "Nothing here is deleted, but the new rules would hide these from the app.",
  );
} else {
  console.log("\nEvery collection has a category.");
}

if (!apply) {
  console.log("\nPreview only. Re-run with --apply.");
  process.exit(0);
}

if (unlisted.length > 0 && !allowUnlisted) {
  console.error(
    "\nStopped. Add a category for these, or pass --allow-unlisted to continue.",
  );
  process.exit(1);
}

fs.writeFileSync(backup, JSON.stringify(originals, null, 2));
console.log(`Backup written to ${backup}`);

// One batch, so the catalog is never observed half-migrated.
const batch = db.batch();
for (const entry of writes) {
  batch.set(db.collection("categories").doc(entry.name), entry);
}
for (const { id } of removals) {
  batch.delete(db.collection("categories").doc(id));
}
await batch.commit();

const cardsAfter = await countCards();
const changed = [
  ...new Set([...cardsBefore.keys(), ...cardsAfter.keys()]),
].filter((id) => cardsBefore.get(id) !== cardsAfter.get(id));
if (changed.length > 0) {
  // Staff may have edited cards during the run, but never assume that.
  console.error(`Card counts changed in: ${changed.join(", ")}. Investigate.`);
  process.exit(1);
}
console.log(
  `Migration complete. ${total(cardsAfter)} cards, counts unchanged.`,
);
