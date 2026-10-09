import { expect, test } from "@playwright/test";
import { cardLinks, cards, heading, walkPages } from "./helpers";

const SEEDED_LISTINGS = 120;
const PAGE_SIZE = 18;

test.describe("home: the explore view (plan §6.3)", () => {
  test("a card shows photo, type and city, title, price per night and rating, and links to the listing", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(cards(page)).toHaveCount(PAGE_SIZE);

    const card = cards(page).first();
    await expect(card.getByRole("img").first()).toBeVisible();
    await expect(card.getByRole("heading")).toHaveText(/^.+ in .+$/);
    await expect(card).toContainText(/₹[\d,]+ per night/);
    await expect(card).toContainText(/(\d\.\d{1,2}|New)/);

    // Capture B1: a listing opens in a tab of its own, named after the listing.
    const link = card.getByRole("link");
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/rooms\/\d+$/);
    await expect(link).toHaveAttribute("target", `listing_${href?.split("/").pop()}`);
  });

  test("pagination walks every listing once, and Back returns to the page before", async ({ page }) => {
    await page.goto("/");
    const pages = await walkPages(page, "Homes pagination");
    const ids = pages.flat();

    expect(pages).toHaveLength(Math.ceil(SEEDED_LISTINGS / PAGE_SIZE));
    expect(pages.slice(0, -1).every((onPage) => onPage.length === PAGE_SIZE)).toBe(true);
    expect(ids).toHaveLength(SEEDED_LISTINGS);
    expect(new Set(ids).size).toBe(SEEDED_LISTINGS);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`\\?page=${pages.length - 1}$`));
    expect(await cardLinks(page)).toEqual(pages.at(-2)?.map((id) => `/rooms/${id}`));
  });

  test("a page past the end explains itself", async ({ page }) => {
    await page.goto("/?page=99");
    await expect(page.getByText("There is no such page")).toBeVisible();
    await page.getByRole("link", { name: "Back to the first page" }).click();
    await expect(cards(page)).toHaveCount(PAGE_SIZE);
  });

  test("the photo arrows change the photo without opening the listing", async ({ page }) => {
    await page.goto("/");
    const card = cards(page).nth(1);
    await card.hover();
    await card.getByRole("button", { name: /^Next photo/ }).click();
    await expect(card.getByRole("img", { name: /^Photo 2 of/ })).toBeVisible();
    await card.getByRole("button", { name: /^Previous photo/ }).click();
    await expect(card.getByRole("img", { name: /^Photo 1 of/ })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a filter chip on home opens the search page with it applied", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("checkbox", { name: "Villa", exact: true }).click();
    await expect(page).toHaveURL(/\/s\/homes\?property_type=villa$/);
    await expect(heading(page)).toHaveText(/^\d+ homes$/);
    for (const text of await cards(page).getByRole("heading").allInnerTexts()) {
      expect(text).toMatch(/^Villa in /);
    }
  });
});
