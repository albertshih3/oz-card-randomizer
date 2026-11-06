vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));
vi.mock("@/lib/firebase", () => ({ db: {} }));

import { getDocs } from "firebase/firestore";
import { parseCard, readCollections } from "@/utils/cards";

describe("parseCard", () => {
  it("assigns identity from the snapshot, not stored fields", () => {
    const card = parseCard("doc1", "disney", {
      id: "stored",
      collection: "elsewhere",
      name: "Lion",
      number: "1",
    });
    expect(card).toMatchObject({ id: "doc1", collection: "disney" });
  });

  it("normalizes a legacy integer number to a string", () => {
    expect(
      parseCard("a", "spoonbill", { name: "Spoonbill", number: 7 })?.number,
    ).toBe("7");
  });

  it("treats a card with no active field as active", () => {
    expect(parseCard("a", "b", { name: "x", number: "1" })?.active).toBe(true);
  });

  it("keeps active false", () => {
    expect(
      parseCard("a", "b", { name: "x", number: "1", active: false })?.active,
    ).toBe(false);
  });

  it.each([
    [{ number: "1" }],
    [{ name: "", number: "1" }],
    [{ name: 5, number: "1" }],
    [{ name: "x" }],
  ])("rejects malformed data %j", (data) => {
    expect(parseCard("a", "b", data)).toBeNull();
  });
});

describe("readCollections", () => {
  const snapshot = (rows: Array<Record<string, unknown>>) => ({
    forEach: (cb: (d: unknown) => void) =>
      rows.forEach((data, i) => cb({ id: `d${i}`, data: () => data })),
  });

  it("reads every collection and counts malformed documents", async () => {
    vi.mocked(getDocs).mockResolvedValue(
      snapshot([{ name: "x", number: "1" }, { number: "2" }]) as never,
    );
    const ids = ["a", "b", "c", "d", "e", "f"];
    const { byCollection, malformed } = await readCollections(ids);
    expect(Object.keys(byCollection).sort()).toEqual(ids);
    expect(byCollection.a).toHaveLength(1);
    expect(malformed).toBe(6);
  });

  it("rejects if a collection cannot be read", async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error("denied"));
    await expect(readCollections(["a"])).rejects.toThrow("denied");
  });
});
