import { expect, test, type Page } from "@playwright/test";

const USERS = [
  {
    id: "u1",
    email: "a@example.test",
    firstName: "A",
    lastName: "B",
    lastSignInAt: null,
  },
];
const TOTALS = { activeUsers: 0, sessions: 0, packGenerations: 0, exports: 0 };
const SUMMARY = { days: 30, series: [], current: TOTALS, prior: TOTALS };
const TOUR_STORAGE_KEY = "oz-admin-tutorial-v1";

const tour = (page: Page) =>
  page.getByRole("dialog", { name: "Admin tutorial" });
const stepLabel = (page: Page, step: number) =>
  tour(page).getByText(`Step ${step} of 10`);

interface Options {
  users?: unknown[];
  chunkDelayMs?: number;
  chunkFails?: boolean;
}

async function setup(page: Page, options: Options = {}) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/users/list", (route) =>
    route.fulfill({ json: options.users ?? USERS }),
  );
  await page.route("**/api/analytics/summary*", (route) =>
    route.fulfill({ json: SUMMARY }),
  );
  await page.route(
    /src\/pages\/admin\/(categories|users|analytics)\.tsx/,
    async (route) => {
      if (options.chunkFails) return route.abort();
      if (options.chunkDelayMs) {
        await new Promise((resolve) =>
          setTimeout(resolve, options.chunkDelayMs),
        );
      }
      return route.continue();
    },
  );
  await page.addInitScript(
    (key) => localStorage.setItem(key, "completed"),
    TOUR_STORAGE_KEY,
  );
  return pageErrors;
}

async function startTour(page: Page) {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Take a tour" }).first().click();
  await expect(stepLabel(page, 1)).toBeVisible();
}

async function advanceTo(page: Page, step: number) {
  for (let current = 1; current < step; current++) {
    await expect(stepLabel(page, current)).toBeVisible();
    await tour(page).getByRole("button", { name: "Next" }).click();
  }
  await expect(stepLabel(page, step)).toBeVisible();
}

test("walks all ten steps forward and back across every route", async ({
  page,
}) => {
  const pageErrors = await setup(page);
  await startTour(page);
  await advanceTo(page, 10);
  await expect(page).toHaveURL(/\/admin\/analytics$/);

  for (let step = 10; step > 1; step--) {
    await tour(page).getByRole("button", { name: "Back" }).click();
    await expect(stepLabel(page, step - 1)).toBeVisible();
  }
  await expect(page).toHaveURL(/\/admin$/);
  expect(pageErrors).toEqual([]);
});

test("stays responsive while a cold route chunk loads", async ({ page }) => {
  await setup(page, { chunkDelayMs: 5000 });
  await startTour(page);
  await advanceTo(page, 5);
  await tour(page).getByRole("button", { name: "Next" }).click();

  await expect(stepLabel(page, 6)).toBeVisible();
  await expect(tour(page).getByText("Loading this page")).toBeVisible();
  await expect(
    page.locator('[data-tutorial-id="nav-drawer"]').first(),
  ).toBeVisible();

  await tour(page).getByRole("button", { name: "Skip" }).click();
  await expect(tour(page)).toHaveCount(0);
  await expect(page.getByTestId("tutorial-spotlight")).toHaveCount(0);
});

test("a failed route chunk stays local and releases the page", async ({
  page,
}) => {
  await setup(page, { chunkFails: true });
  await startTour(page);
  await advanceTo(page, 5);
  await tour(page).getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("This page could not be loaded.")).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await expect(tour(page).getByText("isn’t available")).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByTestId("tutorial-spotlight")).toHaveCSS(
    "pointer-events",
    "none",
  );
  await page.getByRole("button", { name: "Reload" }).hover();
});

test("an empty page leaves the tour usable", async ({ page }) => {
  await setup(page, { users: [] });
  await startTour(page);
  await advanceTo(page, 8);
  await expect(tour(page).getByText("isn’t available")).toBeVisible({
    timeout: 8000,
  });
  await tour(page).getByRole("button", { name: "Next" }).click();
  await expect(stepLabel(page, 9)).toBeVisible();
});

test("rapid Next presses keep the step and route in sync", async ({ page }) => {
  await setup(page);
  await startTour(page);
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("ArrowRight");
  }
  // Input during a transition is dropped, so assert agreement, not distance.
  await expect(tour(page).getByText("Loading this page")).toHaveCount(0);
  const label = await tour(page)
    .getByText(/Step \d+ of 10/)
    .textContent();
  const step = Number(label?.match(/\d+/)?.[0]);
  const expected =
    step <= 5
      ? "/admin"
      : step <= 7
        ? "/admin/categories"
        : step === 8
          ? "/admin/users"
          : "/admin/analytics";
  expect(new URL(page.url()).pathname).toBe(expected);
});

test("browser Back moves the tour with the page", async ({ page }) => {
  await setup(page);
  await startTour(page);
  await advanceTo(page, 8);
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  await expect(tour(page).getByText("Step 6 of 10")).toBeVisible();
});

test("browser Back during a pending navigation cannot strand the tour", async ({
  page,
}) => {
  await setup(page, { chunkDelayMs: 1500 });
  await startTour(page);
  await advanceTo(page, 6);
  await expect(tour(page).getByText("Loading this page")).toHaveCount(0, {
    timeout: 8000,
  });
  await tour(page).getByRole("button", { name: "Next" }).click();
  await tour(page).getByRole("button", { name: "Next" }).click();
  await expect(stepLabel(page, 8)).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  await expect(stepLabel(page, 6)).toBeVisible();
  await expect(tour(page).getByRole("button", { name: "Next" })).toBeEnabled({
    timeout: 8000,
  });
});

test("the centered steps are actually centered", async ({ page }) => {
  await setup(page);
  await startTour(page);
  await page.waitForTimeout(300);
  const box = await tour(page).boundingBox();
  const viewport = page.viewportSize();
  expect(Math.abs(box!.x + box!.width / 2 - viewport!.width / 2)).toBeLessThan(
    2,
  );
  expect(
    Math.abs(box!.y + box!.height / 2 - viewport!.height / 2),
  ).toBeLessThan(2);
});

test("a first visit on a deep link starts at the first step", async ({
  page,
}) => {
  await page.route("**/api/users/list", (route) =>
    route.fulfill({ json: USERS }),
  );
  await page.goto("/admin/users");
  await expect(stepLabel(page, 1)).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(/\/admin$/);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("completes the tour with the sheet on screen", async ({ page }) => {
    const pageErrors = await setup(page);
    await page.addInitScript(
      (key) => localStorage.removeItem(key),
      TOUR_STORAGE_KEY,
    );
    await page.goto("/admin");
    await expect(stepLabel(page, 1)).toBeVisible({ timeout: 5000 });
    await advanceTo(page, 10);
    await tour(page).getByRole("button", { name: "Finish" }).click();
    await expect(tour(page)).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});

test.describe("modal surfaces", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bottom sheet traps focus, closes on Escape, and returns focus", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/admin");
    const trigger = page.getByRole("button", { name: "New card" });
    await trigger.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const inside = await sheet.evaluate((el) =>
        el.contains(document.activeElement),
      );
      expect(inside).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("the navigation drawer closes on Escape and returns focus", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/admin");
    const trigger = page.getByRole("button", {
      name: "Open navigation menu",
    });
    await trigger.click();
    await expect(
      page.getByRole("dialog", { name: "Navigation menu" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
