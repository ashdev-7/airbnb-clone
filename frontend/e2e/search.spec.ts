import { expect, test, type Page } from "@playwright/test";
import { cardLinks, cards, daysFromNow, heading, homesFound, walkPages } from "./helpers";

const RESULTS_NAV = "Search results pagination";
const PAGE_SIZE = 18;

const searchBar = (page: Page) => page.getByRole("banner").getByRole("search");
const filterRow = (page: Page) => page.getByRole("banner").getByRole("group", { name: "Filters" });
const pathAndQuery = (page: Page) => new URL(page.url()).pathname + new URL(page.url()).search;

test.describe("searching (plan §6.4)", () => {
  test("Where suggests places by their own name", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Search destinations").fill("ma");
    const panel = searchBar(page).locator("xpath=..");
    await expect(panel.getByRole("button", { name: /^Manali, Himachal Pradesh, India/ })).toBeVisible();
    await expect(panel.getByRole("button", { name: /^Maharashtra, India/ })).toBeVisible();
    await expect(panel.getByRole("button", { name: /Mumbai|Shimla/ })).toHaveCount(0);
  });

  test("place, dates and guests go into the URL, the results and the links to listings", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Search destinations").fill("mana");
    const panel = searchBar(page).locator("xpath=..");
    await panel.getByRole("button", { name: /^Manali/ }).click();

    // Choosing a place opens the calendar; past days cannot be chosen.
    const days = panel.getByRole("grid").locator("button");
    await expect(panel.getByRole("grid")).toHaveCount(2);
    expect(await days.and(page.locator(":disabled")).count()).toBeGreaterThan(0);
    const free = days.and(page.locator(":enabled"));
    await free.nth(12).click();
    await free.nth(15).click();

    // Choosing check-out opens the guests.
    await panel.getByRole("button", { name: "Increase Adults" }).click();
    await panel.getByRole("button", { name: "Increase Adults" }).click();
    await panel.getByRole("button", { name: "Increase Children" }).click();
    await searchBar(page).getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(
      /\/s\/Manali[^/]*\/homes\?checkin=\d{4}-\d\d-\d\d&checkout=\d{4}-\d\d-\d\d&adults=2&children=1$/,
    );
    const query = new URL(page.url()).searchParams;
    await expect(heading(page)).toHaveText(/^\d+ homes? in Manali$/);
    for (const text of await cards(page).getByRole("heading").allInnerTexts()) {
      expect(text).toMatch(/ in Manali$/);
    }
    // The listing page uses its own parameter names (capture C2).
    for (const href of await cardLinks(page)) {
      expect(href).toContain(`check_in=${query.get("checkin")}&check_out=${query.get("checkout")}`);
      expect(href).toContain("adults=2&children=1");
    }
    await expect(searchBar(page)).toContainText("Homes in Manali");
    await expect(searchBar(page)).toContainText("3 guests");
    await expect(searchBar(page)).not.toContainText("Anytime");
  });

  test("with dates, a card adds the total of the stay, equal to the quote of the server", async ({ page }) => {
    const [checkIn, checkOut] = [daysFromNow(60), daysFromNow(63)];
    await page.goto(`/s/Jaipur/homes?checkin=${checkIn}&checkout=${checkOut}&adults=2`);
    const card = cards(page).first();
    await expect(card).toContainText(/₹[\d,]+ per night·₹[\d,]+ total/);

    const id = (await cardLinks(page))[0].split("/rooms/")[1].split("?")[0];
    const quote = await page.request.get(
      `/api/listings/${id}/quote?check_in=${checkIn}&check_out=${checkOut}&adults=2`,
    );
    const total = (await quote.json()).total_minor / 100;
    await expect(card).toContainText(`₹${total.toLocaleString("en-IN")} total`);
  });

  test("clicking the pill opens the full bar on that part; Escape puts it away", async ({ page }) => {
    await page.goto("/s/Goa/homes");
    await searchBar(page).getByRole("button", { name: /Anytime/ }).click();
    await expect(page.getByRole("banner").getByRole("grid")).toHaveCount(2);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("banner").getByRole("grid")).toHaveCount(0);
    await expect(searchBar(page)).toContainText("Homes in Goa");
  });
});

test.describe("filters and results (plan §6.5)", () => {
  test("a city fills more than one page; pagination under a filter shows every match once", async ({ page }) => {
    await page.goto("/s/Goa/homes");
    const inGoa = await homesFound(page);
    expect(inGoa).toBe(40);
    const all = (await walkPages(page, RESULTS_NAV)).flat();
    expect(all).toHaveLength(inGoa);
    expect(new Set(all).size).toBe(inGoa);

    // A filter that leaves more than one page but fewer than all the homes.
    await page.goto("/s/homes");
    const everywhere = await homesFound(page);
    await filterRow(page).getByRole("checkbox", { name: "Pets allowed" }).click();
    await expect(page).toHaveURL(/\/s\/homes\?pets_allowed=true$/);
    const withPets = await homesFound(page);
    expect(withPets).toBeGreaterThan(PAGE_SIZE);
    expect(withPets).toBeLessThan(everywhere);

    const pages = await walkPages(page, RESULTS_NAV);
    const ids = pages.flat();
    expect(pages).toHaveLength(Math.ceil(withPets / PAGE_SIZE));
    expect(ids).toHaveLength(withPets);
    expect(new Set(ids).size).toBe(withPets);

    // The same set the API reports, so none is missing.
    const expected: number[] = [];
    for (let number = 1; number <= pages.length; number++) {
      const response = await page.request.get(`/api/listings?pets=1&page=${number}`);
      expected.push(...(await response.json()).items.map((item: { id: number }) => item.id));
    }
    expect(ids).toEqual(expected);
  });

  test("chips change the URL and the results, and Back restores the search before", async ({ page }) => {
    await page.goto("/s/Goa/homes");
    const before = await homesFound(page);
    const firstPage = await cardLinks(page);

    await filterRow(page).getByRole("checkbox", { name: "Pool" }).click();
    await expect(page).toHaveURL(/\/s\/Goa\/homes\?amenities=pool$/);
    const withPool = await homesFound(page);
    expect(withPool).toBeLessThan(before);

    await filterRow(page).getByRole("checkbox", { name: "Villa", exact: true }).click();
    await expect(page).toHaveURL(/\/s\/Goa\/homes\?property_type=villa&amenities=pool$/);
    await expect(filterRow(page).getByRole("checkbox", { checked: true })).toHaveText(["Villa", "Pool"]);
    expect(await homesFound(page)).toBeLessThanOrEqual(withPool);

    await page.goBack();
    await expect(page).toHaveURL(/\?amenities=pool$/);
    // The results of the address gone back to arrive a moment after the address changes.
    await expect.poll(() => homesFound(page)).toBe(withPool);
    await page.goBack();
    await expect(page).toHaveURL(/\/s\/Goa\/homes$/);
    await expect.poll(() => homesFound(page)).toBe(before);
    expect(await cardLinks(page)).toEqual(firstPage);
    await expect(filterRow(page).getByRole("checkbox", { checked: true })).toHaveCount(0);
  });

  test("the modal keeps a draft, counts what it would find, and applies to the URL", async ({ page }) => {
    await page.goto("/s/homes");
    const everywhere = await homesFound(page);
    await filterRow(page).getByRole("button", { name: /^Filters/ }).click();
    const modal = page.getByRole("dialog", { name: "Filters" });
    const show = modal.getByRole("button", { name: /^Show (\d|homes)/ });
    await expect(show).toHaveText(`Show ${everywhere} homes`);

    for (let clicks = 0; clicks < 3; clicks++) {
      await modal.getByRole("button", { name: "Increase Bedrooms" }).click();
    }
    await modal.getByRole("checkbox", { name: "Pool" }).click();
    await expect(show).not.toHaveText(`Show ${everywhere} homes`);
    await expect(show).toHaveText(/^Show \d+ homes?$/);
    await expect(async () => {
      const response = await page.request.get("/api/listings/summary?min_bedrooms=3&amenity=pool");
      await expect(show).toHaveText(new RegExp(`^Show ${(await response.json()).total} homes?$`));
    }).toPass();
    const promised = Number((await show.innerText()).split(" ")[1]);
    expect(pathAndQuery(page)).toBe("/s/homes"); // nothing is applied yet

    await show.click();
    await expect(page).toHaveURL(/\/s\/homes\?amenities=pool&min_bedrooms=3$/);
    expect(await homesFound(page)).toBe(promised);
    await expect(filterRow(page).getByLabel("2 active")).toBeVisible();

    // "Clear all" empties the draft; applying it removes the filters.
    await filterRow(page).getByRole("button", { name: /^Filters/ }).click();
    await modal.getByRole("button", { name: "Clear all" }).click();
    await show.click();
    await expect(page).toHaveURL(/\/s\/homes$/);
  });

  test("every kind of filter narrows the results", async ({ page }) => {
    await page.goto("/s/homes");
    const everywhere = await homesFound(page);
    for (const query of [
      "price_max=3000",
      "price_min=20000",
      "property_type=villa",
      "amenities=pool",
      "adults=8",
      "adults=2&pets=1",
      "min_bedrooms=4",
      "min_beds=5",
      "min_bathrooms=3",
      `checkin=${daysFromNow(7)}&checkout=${daysFromNow(12)}`,
    ]) {
      await page.goto(`/s/homes?${query}`);
      const found = await homesFound(page);
      expect(found, query).toBeGreaterThan(0);
      expect(found, query).toBeLessThan(everywhere);
    }
  });

  test("no results, an unknown place, past dates and a page past the end each have a state", async ({ page }) => {
    await page.goto("/s/homes?min_bedrooms=8&price_max=1800");
    await expect(heading(page)).toHaveText("No homes match your search");
    await page.getByRole("link", { name: "Remove all filters" }).click();
    await expect(page).toHaveURL(/\/s\/homes$/);
    expect(await homesFound(page)).toBeGreaterThan(0);

    await page.goto("/s/Atlantis/homes");
    await expect(heading(page)).toHaveText("No homes match your search");
    await expect(page.getByRole("link", { name: "Search everywhere" })).toBeVisible();

    await page.goto("/s/homes?checkin=2020-01-01&checkout=2020-01-05");
    await expect(page.getByRole("main").getByText("Those dates can no longer be booked")).toBeVisible();
    expect(await homesFound(page)).toBeGreaterThan(0);

    await page.goto("/s/homes?page=99");
    await expect(heading(page)).toHaveText("There is no such page");
  });

  test("the map has a marker per listing, and a marker opens a card that links to the listing", async ({
    page,
  }) => {
    await page.goto("/s/Udaipur/homes");
    const found = await homesFound(page);
    const map = page.getByRole("region", { name: /^Map of homes/ });
    const markers = map.locator(".map-price span");
    await expect(markers).toHaveCount(found);

    // Markers of homes close together overlap; whichever is on top opens a card.
    await markers.first().click({ force: true });
    const card = map.locator(".map-card");
    await expect(card.getByRole("link")).toHaveAttribute("href", /^\/rooms\/\d+$/);
    await expect(card).toContainText(/₹[\d,]+ per night/);
    await card.getByRole("button", { name: "Close" }).click();
    await expect(card).toHaveCount(0);
  });
});
