import { expect, test } from "@playwright/test";
import { cards, heading } from "./helpers";

const ROWS = ["Popular homes in Goa", "Stay in Manali", "Homes in Jaipur", "Stay in Kerala", "Homes in Karnataka"];

test.describe("home: rows of homes by destination (plan §6.3, capture A1)", () => {
  test("shows a row per destination, seven cards across, and no filters or pagination", async ({ page }) => {
    await page.goto("/");
    for (const title of ROWS) {
      await expect(page.getByRole("region", { name: title }).getByRole("heading", { name: title })).toBeVisible();
    }
    const goa = page.getByRole("region", { name: ROWS[0] });
    await expect(goa.getByRole("article")).toHaveCount(14);
    await expect(goa).toContainText("40 homes");

    // Seven cards fit the row at the captured window; the eighth starts past its right edge.
    const row = await goa.getByRole("list").boundingBox();
    const seventh = await goa.getByRole("article").nth(6).boundingBox();
    const eighth = await goa.getByRole("article").nth(7).boundingBox();
    expect(seventh!.x + seventh!.width).toBeLessThanOrEqual(row!.x + row!.width + 1);
    expect(eighth!.x).toBeGreaterThanOrEqual(row!.x + row!.width - 1);

    // Filters, the grid with its map, and pagination live on the search page, not here.
    await expect(page.getByRole("group", { name: "Filters" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: /pagination/ })).toHaveCount(0);
  });

  test("a card shows photo, type and city, price per night and rating, and links to the listing", async ({
    page,
  }) => {
    await page.goto("/");
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

  test("the row arrows move the row; the heading opens the search for the place", async ({ page }) => {
    await page.goto("/");
    const goa = page.getByRole("region", { name: ROWS[0] });
    const previous = goa.getByRole("button", { name: /^Previous homes/ });
    const next = goa.getByRole("button", { name: /^Next homes/ });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(previous).toBeEnabled();
    await expect(next).toBeDisabled();
    await expect(goa.getByRole("article").nth(13)).toBeInViewport();
    await previous.click();
    await expect(previous).toBeDisabled();

    await goa.getByRole("link", { name: /Popular homes in Goa/ }).click();
    await expect(page).toHaveURL(/\/s\/Goa\/homes$/);
    await expect(heading(page)).toHaveText("40 homes in Goa");
    await expect(page.getByRole("navigation", { name: "Search results pagination" })).toBeVisible();
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

  test("the Homes tab opens the full list with filters and pagination", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Categories" }).getByRole("link", { name: "Homes" }).click();
    await expect(page).toHaveURL(/\/s\/homes$/);
    await expect(heading(page)).toHaveText("120 homes");
    await expect(page.getByRole("banner").getByRole("group", { name: "Filters" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Search results pagination" })).toBeVisible();
  });
});
