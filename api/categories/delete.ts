import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { requireApproved } from "../_auth.js";
import { getFirebaseAdminApp } from "../_firebase-admin.js";
import { readJsonObject } from "../_http.js";

/** Pack generation depends on these. Mirrors COLLECTION_IDS in src/constants. */
const REQUIRED_CATEGORIES = new Set([
  "tropicalrainforest",
  "childrenszoo",
  "californiatrail",
  "africansavanna",
  "spoonbill",
]);

/**
 * Deletes an empty optional category. Runs here because a client cannot make
 * "empty, then delete" safe: the category is first marked `deleting`, which
 * firestore.rules treats as closed to card writes, and only then counted. A card
 * written before the mark is seen by the count; one written after is rejected.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  try {
    await requireApproved(req, res);
  } catch {
    return;
  }

  const body = readJsonObject(req, res);
  if (!body) return;

  const { id } = body;
  if (typeof id !== "string" || !/^[a-z0-9]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid category." });
    return;
  }

  if (REQUIRED_CATEGORIES.has(id)) {
    res
      .status(409)
      .json({ error: "This category is required for pack generation." });
    return;
  }

  let marked: DocumentReference[] = [];
  try {
    const db = getFirestore(getFirebaseAdminApp());
    // Before migration a category can have several documents with this name.
    const canonical = db.collection("categories").doc(id);
    const [byName, byId] = await Promise.all([
      db.collection("categories").where("name", "==", id).get(),
      canonical.get(),
    ]);
    const refs = new Map(byName.docs.map((d) => [d.ref.path, d.ref]));
    if (byId.exists) refs.set(canonical.path, canonical);

    if (refs.size === 0) {
      res.status(404).json({ error: "Category not found." });
      return;
    }

    const mark = db.batch();
    marked = [...refs.values()];
    marked.forEach((ref) => mark.update(ref, { deleting: true }));
    await mark.commit();

    const count = (await db.collection(id).count().get()).data().count;
    if (count > 0) {
      const unmark = db.batch();
      marked.forEach((ref) => unmark.update(ref, { deleting: false }));
      await unmark.commit();
      res.status(409).json({
        error: `This category still has ${count} card${count === 1 ? "" : "s"}. Move or delete them first.`,
      });
      return;
    }

    const remove = db.batch();
    marked.forEach((ref) => remove.delete(ref));
    await remove.commit();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[POST /api/categories/delete]", err);
    res.status(500).json({ error: "Failed to delete category." });
  }
}
