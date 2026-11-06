import fs from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const hoursFromNow = (hours: number) =>
  Math.floor(Date.now() / 1000) + hours * 3600;

const LIVE_LEASE = { approved: true, approvedUntil: hoursFromNow(1) };
const CARD = { name: "Lion", number: "12", active: true };

let env: RulesTestEnvironment;

const anonymous = () => env.unauthenticatedContext().firestore();
const unapproved = () => env.authenticatedContext("plain").firestore();
const approved = () =>
  env.authenticatedContext("admin", LIVE_LEASE).firestore();
const revoked = () =>
  env
    .authenticatedContext("revoked", {
      approved: true,
      approvedUntil: hoursFromNow(-1),
    })
    .firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-oz-rules",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "categories", "disney"), {
      name: "disney",
      displayName: "Disney",
      isWildcardEligible: true,
    });
    await setDoc(doc(db, "categories", "closing"), {
      name: "closing",
      displayName: "Closing",
      isWildcardEligible: false,
      deleting: true,
    });
    await setDoc(doc(db, "disney", "card1"), CARD);
    await setDoc(doc(db, "spoonbill", "legacy"), {
      name: "Spoonbill",
      number: 1,
      active: true,
      category: "spoonbill",
      collection: "spoonbill",
    });
    await setDoc(doc(db, "private", "doc"), { secret: true });
  });
});

describe("public catalog reads", () => {
  it("lets anyone read categories and catalog cards", async () => {
    await assertSucceeds(getDocs(collection(anonymous(), "categories")));
    await assertSucceeds(getDocs(collection(anonymous(), "disney")));
  });

  it("reads required sets even with no metadata document", async () => {
    await assertSucceeds(getDocs(collection(anonymous(), "spoonbill")));
  });

  it("denies unrelated collections, even to approved users", async () => {
    await assertFails(getDoc(doc(anonymous(), "private", "doc")));
    await assertFails(getDoc(doc(approved(), "private", "doc")));
  });
});

describe("write authorization", () => {
  it.each([
    ["anonymous", anonymous],
    ["unapproved", unapproved],
    ["revoked", revoked],
  ])("denies %s card and category writes", async (_label, context) => {
    await assertFails(addDoc(collection(context(), "disney"), CARD));
    await assertFails(
      updateDoc(doc(context(), "disney", "card1"), { active: false }),
    );
    await assertFails(deleteDoc(doc(context(), "disney", "card1")));
    await assertFails(
      setDoc(doc(context(), "categories", "newset"), {
        name: "newset",
        displayName: "New",
        isWildcardEligible: false,
      }),
    );
  });

  it("denies a claim without a lease", async () => {
    const db = env
      .authenticatedContext("noLease", { approved: true })
      .firestore();
    await assertFails(addDoc(collection(db, "disney"), CARD));
  });

  it("denies a self-asserted string claim", async () => {
    const db = env
      .authenticatedContext("forged", {
        approved: "true",
        approvedUntil: hoursFromNow(1),
      })
      .firestore();
    await assertFails(addDoc(collection(db, "disney"), CARD));
  });

  it("allows approved users to manage the catalog", async () => {
    const db = approved();
    await assertSucceeds(addDoc(collection(db, "disney"), CARD));
    await assertSucceeds(
      updateDoc(doc(db, "disney", "card1"), { active: false }),
    );
    await assertSucceeds(deleteDoc(doc(db, "disney", "card1")));
    await assertSucceeds(
      updateDoc(doc(db, "categories", "disney"), { isWildcardEligible: false }),
    );
  });

  it("keeps rate limit counters away from every client", async () => {
    await assertFails(getDoc(doc(approved(), "rateLimits", "any")));
    await assertFails(
      setDoc(doc(approved(), "rateLimits", "any"), { count: 0 }),
    );
  });

  it("denies approved writes to unknown collections", async () => {
    await assertFails(addDoc(collection(approved(), "unknown"), CARD));
    await assertFails(
      setDoc(doc(approved(), "approvals", "plain"), { ok: true }),
    );
  });
});

describe("card validation", () => {
  it.each([
    ["empty name", { ...CARD, name: "" }],
    ["long name", { ...CARD, name: "x".repeat(201) }],
    ["numeric number", { ...CARD, number: 12 }],
    ["non-digit number", { ...CARD, number: "12a" }],
    ["string active", { ...CARD, active: "yes" }],
    ["extra field", { ...CARD, role: "admin" }],
    ["missing active", { name: "Lion", number: "12" }],
  ])("rejects a new card with %s", async (_label, card) => {
    await assertFails(addDoc(collection(approved(), "disney"), card));
  });

  it("lets a legacy card with an integer number toggle active", async () => {
    await assertSucceeds(
      updateDoc(doc(approved(), "spoonbill", "legacy"), { active: false }),
    );
  });

  it("rejects adding fields to an existing card", async () => {
    await assertFails(
      updateDoc(doc(approved(), "disney", "card1"), { role: "admin" }),
    );
  });
});

describe("category integrity", () => {
  const entry = (id: string) => ({
    name: id,
    displayName: "Set",
    isWildcardEligible: false,
  });

  it("creates a well-formed category", async () => {
    await assertSucceeds(
      setDoc(doc(approved(), "categories", "newset"), entry("newset")),
    );
  });

  it("rejects a name that differs from the document id", async () => {
    await assertFails(
      setDoc(doc(approved(), "categories", "newset"), entry("other")),
    );
  });

  it.each(["categories", "admin", "users", "Bad-Id"])(
    "rejects the id %s",
    async (id) => {
      await assertFails(setDoc(doc(approved(), "categories", id), entry(id)));
    },
  );

  it("keeps category identity immutable", async () => {
    await assertFails(
      updateDoc(doc(approved(), "categories", "disney"), { name: "renamed" }),
    );
  });

  it("never lets a client delete a category", async () => {
    await assertFails(deleteDoc(doc(approved(), "categories", "disney")));
  });

  it("blocks card writes while a category is being deleted", async () => {
    await assertFails(addDoc(collection(approved(), "closing"), CARD));
  });
});
