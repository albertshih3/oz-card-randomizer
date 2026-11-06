import { expect, test, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

const seedCatalog = (page: Page, config: unknown) =>
  page.addInitScript((value) => {
    window.__E2E_FIRESTORE__ = value as never;
  }, config);

async function exportPacks(page: Page, count: string) {
  await page.getByRole("button", { name: "Export packs" }).click();
  await page.getByLabel("Number of Packs").fill(count);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate & Export" }).click();
  const file = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of file) chunks.push(chunk as Buffer);
  const workbook = XLSX.read(Buffer.concat(chunks));
  return XLSX.utils.sheet_to_json<Record<string, string | number>>(
    workbook.Sheets["Booster Packs"],
    { defval: "" },
  );
}

test("downloads a real workbook with every slot filled", async ({ page }) => {
  await page.goto("/");
  const rows = await exportPacks(page, "3");

  expect(rows).toHaveLength(3);
  expect(Object.keys(rows[0])).toEqual([
    "Pack #",
    "Tropical Rainforest 1",
    "Tropical Rainforest 2",
    "Children's Zoo 1",
    "Children's Zoo 2",
    "California Trail 1",
    "California Trail 2",
    "African Savanna 1",
    "African Savanna 2",
    "Wildcard",
    "Spoonbill",
    "Warnings",
  ]);
  for (const row of rows) {
    expect(row["Wildcard"]).toContain("disney");
    expect(row["Spoonbill"]).toContain("spoonbill");
    expect(row["Warnings"]).toBe("");
  }
});

test("explains an incomplete pack on screen and in the workbook", async ({
  page,
}) => {
  await seedCatalog(page, { cards: { spoonbill: [] } });
  await page.goto("/");

  await page.getByRole("button", { name: "Generate pack" }).click();
  await expect(page.getByText("Incomplete pack: 9 of 10 cards")).toBeVisible();

  const [row] = await exportPacks(page, "1");
  expect(row["Spoonbill"]).toBe("");
  expect(row["Warnings"]).toBe("Incomplete (9 of 10): missing Spoonbill");
});

test("a failed export stays recoverable", async ({ page }) => {
  await page.goto("/");
  await page.route(/xlsx/, (route) => route.abort());

  await page.getByRole("button", { name: "Export packs" }).click();
  await page.getByRole("button", { name: "Generate & Export" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be created");

  await page.unroute(/xlsx/);
  await expect(
    page.getByRole("button", { name: "Retry export" }),
  ).toBeEnabled();
});

test("a failed catalog load blocks generation", async ({ page }) => {
  await seedCatalog(page, { fail: true });
  await page.goto("/");
  await expect(page.getByText("Card data did not load")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate pack" }),
  ).toBeDisabled();
});
