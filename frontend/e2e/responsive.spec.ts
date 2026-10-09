import { expect, test, type Page } from "@playwright/test";
import { cards, daysFromNow, heading, signIn } from "./helpers";

/* Responsive design (bonus B6): the main pages at phone and tablet widths. */

const STAY = `check_in=${daysFromNow(60)}&check_out=${daysFromNow(62)}&adults=1`;

/** A page that fits has nothing to scroll sideways. */
async function expectNoSidewaysScroll(page: Page, name: string) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra, `${name} is wider than the window`).toBeLessThanOrEqual(0);
}

for (const [device, width] of [
  ["phone", 390],
  ["tablet", 820],
] as const) {
  test.describe(`on a ${device} (${width} px)`, () => {
    test.use({ viewport: { width, height: 844 } });

    test("every main page fits the window", async ({ page }) => {
      await page.goto("/");
      await expect(cards(page).first()).toBeVisible();
      await expectNoSidewaysScroll(page, "home");

      await page.goto("/s/Goa/homes");
      await expect(cards(page).first()).toBeVisible();
      await expectNoSidewaysScroll(page, "results");

      await page.goto(`/rooms/40?${STAY}`);
      await expect(page.getByRole("complementary", { name: "Reserve this place" })).toContainText("Total");
      await expectNoSidewaysScroll(page, "listing");

      await page.goto("/");
      await signIn(page, "Vikram Mehta");
      for (const path of [`/book/stays/40?${STAY}`, "/trips", "/wishlists", "/users/profile"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expectNoSidewaysScroll(page, path);
      }
      await page.goto("/hosting");
      await expect(page.getByRole("button", { name: /^Edit / }).first()).toBeVisible();
      await expectNoSidewaysScroll(page, "hosting");
      await page.getByRole("button", { name: "Create listing" }).click();
      await expect(page.getByRole("dialog", { name: "Create listing" })).toBeVisible();
      await expectNoSidewaysScroll(page, "the listing form");
    });
  });
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a search can be made from the pill: place, one month of dates, guests", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("search").getByRole("button", { name: /Location/ }).click();
    const bar = page.getByRole("search");
    await bar.getByPlaceholder("Search destinations").fill("Goa");
    await bar.getByRole("button", { name: /When/ }).click();
    await expect(page.getByRole("banner").getByRole("grid")).toHaveCount(1);
    await bar.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/s\/Goa\/homes/);
    await expect(heading(page)).toContainText("homes in Goa");
  });

  test("the listing calendar shows one month and the gallery one photo", async ({ page }) => {
    await page.goto("/rooms/40");
    await expect(page.getByRole("region", { name: "Select check-in date" }).getByRole("grid")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^Photo \d of \d+/ })).toHaveCount(1);
  });
});
