#!/usr/bin/env node
// Moves category metadata to one document per category, keyed by category ID.
// Required before deploying firestore.rules, which look categories up by ID.
//
// Production has auto-generated document IDs and several duplicates per
// category. The app uses the first document per name in document ID order, so
// that document's values are kept: live behavior does not change. Card
// collections are not touched.
//
//   node --env-file=.env.local scripts/migrate-categories.mjs           # preview
//   node --env-file=.env.local scripts/migrate-categories.mjs --apply
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

if (!apply) {
  console.log("Preview only. Re-run with --apply.");
  process.exit(0);
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
console.log("Migration complete.");
