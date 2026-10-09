import { expect, test, type Page } from "@playwright/test";
import { accountPicker, cards, daysFromNow, heading } from "./helpers";

/** Seeded listings by id (backend/app/seed/stays.py): 2 is booked for nearly all of next month. */
const NEARLY_FULL = 2;
const ANY = 40;

const card = (page: Page) => page.getByRole("complementary", { name: "Reserve this place" });
const priceDetails = (page: Page) => card(page).getByLabel("Price details");
const rupees = (minor: number) => `₹${(minor / 100).toLocaleString("en-IN")}`;

async function quote(page: Page, id: number, query: string) {
  const response = await page.request.get(`/api/listings/${id}/quote?${query}`);
  return { status: response.status(), body: await response.json() };
}

test.describe("the listing page (plan §6.6)", () => {
  test("shows the photos, the description, the amenities, the host, the reviews and the location", async ({
    page,
  }) => {
    await page.goto(`/rooms/${ANY}`);
    const listing = await (await page.request.get(`/api/listings/${ANY}`)).json();

    await expect(heading(page)).toHaveText(listing.title);
    await expect(page.getByRole("button", { name: /^Photo \d of \d+/ })).toHaveCount(Math.min(5, listing.photos.length));
    await expect(page.getByRole("heading", { name: new RegExp(`^Entire .+ in ${listing.city}, India$`) })).toBeVisible();
    await expect(page.getByRole("region", { name: "About this place" })).toContainText(listing.description.slice(0, 40));
    await expect(page.getByRole("heading", { name: `Hosted by ${listing.host.name}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What this place offers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Where you’ll be" })).toBeVisible();
    await expect(page.getByRole("region", { name: /^Map of the area/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meet your host" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Things to know" })).toBeVisible();
    await expect(page.getByText(`${listing.max_guests} guest${listing.max_guests === 1 ? "" : "s"} maximum`)).toBeVisible();
    await expect(card(page)).toContainText(`${rupees(listing.price_per_night_minor)} per night`);
  });

  test("an unknown listing, or an address that is not a listing, is the not-found page", async ({ page }) => {
    // The page is streamed, so the status line has gone out (200) before the listing is
    // looked up; what the visitor gets is the not-found page, marked not to be indexed.
    for (const path of ["/rooms/999999", "/rooms/abc"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "We can’t find that page" })).toBeVisible();
      expect(await page.locator('meta[name="robots"][content="noindex"]').count()).toBeGreaterThan(0);
      await expect(page.getByRole("complementary", { name: "Reserve this place" })).toHaveCount(0);
    }
    expect((await page.request.get("/api/listings/999999")).status()).toBe(404);
  });

  test("amenities and reviews open in full, and Back closes them", async ({ page }) => {
    await page.goto(`/rooms/${ANY}`);
    await page.getByRole("button", { name: /^Show all \d+ amenities$/ }).click();
    await expect(page).toHaveURL(/modal=amenities/);
    const amenities = page.getByRole("dialog", { name: "What this place offers" });
    await expect(amenities.getByRole("heading", { level: 3 }).first()).toBeVisible();
    await page.goBack();
    await expect(amenities).toBeHidden();
    await expect(page).not.toHaveURL(/modal=/);

    const reviews = await (await page.request.get(`/api/listings/${ANY}/reviews`)).json();
    await page.getByRole("button", { name: /^Show all \d+ reviews?$/ }).click();
    const modal = page.getByRole("dialog", { name: "Reviews" });
    await expect(modal.getByRole("article")).toHaveCount(Math.min(10, reviews.total));
    if (reviews.total > 10) {
      await modal.getByRole("button", { name: "Show more reviews" }).click();
      await expect(modal.getByRole("article")).toHaveCount(Math.min(20, reviews.total));
    }
    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).toBeHidden();
    await expect(page).not.toHaveURL(/modal=/);
  });

  test("Share copies the link of the listing; Save needs an account", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/rooms/${ANY}?check_in=${daysFromNow(80)}&check_out=${daysFromNow(82)}&adults=2`);
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("dialog", { name: "Share this place" }).getByRole("button", { name: "Copy Link" }).click();
    await expect(page.getByText("Link copied")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/rooms/${ANY}$`));

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(accountPicker(page)).toBeVisible();
  });
});

test.describe("photos (R-LD-1)", () => {
  test("the photo tour and the single photo work with the keyboard and with Back", async ({ page }) => {
    await page.goto(`/rooms/${ANY}`);
    const listing = await (await page.request.get(`/api/listings/${ANY}`)).json();
    const total = listing.photos.length;

    await page.getByRole("button", { name: "Show all photos" }).click();
    await expect(page).toHaveURL(/modal=photos/);
    const tour = page.getByRole("dialog", { name: "Photo tour" });
    await expect(tour.getByRole("button", { name: /^Open photo/ })).toHaveCount(total);

    await tour.getByRole("button", { name: "Open photo 2 of" }).click();
    await expect(page).toHaveURL(/modal=photo&photo=1/);
    const single = page.getByRole("dialog", { name: `2 / ${total}` });
    await expect(single).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog", { name: `3 / ${total}` })).toBeVisible();
    await expect(page).toHaveURL(/photo=2/);
    // Two presses at once: each one counts, although the address follows a moment later.
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("dialog", { name: `1 / ${total}` })).toBeVisible();
    await expect(page).toHaveURL(/photo=0/);
    await expect(page.getByRole("button", { name: "Previous photo" })).toBeHidden();

    // Escape closes the photo and shows the tour again; Back closes the tour.
    await page.keyboard.press("Escape");
    await expect(tour).toBeVisible();
    await expect(page).toHaveURL(/modal=photos/);
    await page.goBack();
    await expect(tour).toBeHidden();
    await expect(page).not.toHaveURL(/modal=/);
    await expect(heading(page)).toHaveText(listing.title);
  });

  test("a link straight to a photo opens it, and closing never leaves the listing", async ({ page }) => {
    await page.goto(`/rooms/${ANY}?modal=photo&photo=2`);
    await expect(page.getByRole("dialog", { name: /^3 \/ \d+$/ })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Photo tour" })).toBeVisible();
    await page.getByRole("button", { name: "Close the photo tour" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/rooms/${ANY}\\?adults=1$`));
  });
});

test.describe("dates, guests and the price (R-LD-3, R-LD-4)", () => {
  test("the calendar disables past days and booked nights", async ({ page }) => {
    await page.goto(`/rooms/${NEARLY_FULL}`);
    const section = page.getByRole("region", { name: "Select check-in date" });
    const months = section.getByRole("grid");
    await expect(months).toHaveCount(2);

    const availability = await (await page.request.get(`/api/listings/${NEARLY_FULL}/availability`)).json();
    expect(availability.booked.length).toBeGreaterThan(3);

    // This month: every day before today is disabled. Next month: booked for all but two
    // nights (plan §12), so almost nothing can be chosen as a check-in.
    const today = Number(daysFromNow(0).slice(8));
    await expect(months.first().locator("button:disabled")).toHaveCount(
      await months.first().locator("button").evaluateAll(
        (buttons, day) => buttons.filter((b) => Number(b.textContent) < day || (b as HTMLButtonElement).disabled).length,
        today,
      ),
    );
    expect(await months.first().locator("button:disabled").count()).toBeGreaterThanOrEqual(today - 1);
    const freeNextMonth = await months.nth(1).locator("button:enabled").count();
    expect(freeNextMonth).toBeGreaterThan(0);
    expect(freeNextMonth).toBeLessThanOrEqual(3);
  });

  test("the breakdown is the server's quote and follows every change of dates and guests", async ({ page }) => {
    const listing = await (await page.request.get(`/api/listings/${ANY}`)).json();
    const [checkIn, checkOut] = [daysFromNow(90), daysFromNow(93)];
    await page.goto(`/rooms/${ANY}?check_in=${checkIn}&check_out=${checkOut}&adults=1`);

    const first = (await quote(page, ANY, `check_in=${checkIn}&check_out=${checkOut}&adults=1`)).body;
    await expect(priceDetails(page)).toContainText(`3 nights x ${rupees(first.nightly_price_minor)}`);
    await expect(priceDetails(page)).toContainText(rupees(first.nights_total_minor));
    await expect(priceDetails(page)).toContainText(`AirStay service fee${rupees(first.service_fee_minor)}`);
    await expect(priceDetails(page)).toContainText(`Total${rupees(first.total_minor)}`);
    await expect(page.getByRole("heading", { name: `3 nights in ${listing.city}` })).toBeVisible();

    // Guests: the stepper stops at the capacity of the listing, and the URL follows.
    await card(page).getByRole("button", { name: /Guests/ }).click();
    const increase = card(page).getByRole("button", { name: "Increase Adults" });
    for (let adults = 1; adults < listing.max_guests; adults++) await increase.click();
    await expect(increase).toBeDisabled();
    await expect(card(page).getByRole("button", { name: "Increase Children" })).toBeDisabled();
    await expect(page).toHaveURL(new RegExp(`adults=${listing.max_guests}`));
    await expect(card(page)).toContainText(`maximum of ${listing.max_guests} guest`);
    await page.keyboard.press("Escape");
    await expect(priceDetails(page)).toContainText(`Total${rupees(first.total_minor)}`);

    // Dates: clearing removes the price; a longer stay costs what the server says.
    await card(page).getByRole("button", { name: /Check-in/ }).click();
    const panel = card(page).getByRole("dialog", { name: "Choose dates" });
    const [, month, day] = checkIn.split("-").map(Number);
    await expect(panel).toContainText(`${month}/${day}/${checkIn.slice(0, 4)}`);
    await panel.getByRole("button", { name: "Clear dates" }).click();
    await expect(page).not.toHaveURL(/check_in/);
    await expect(priceDetails(page)).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "Check availability" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Select check-in date" }).first()).toBeVisible();

    const free = panel.getByRole("grid").nth(1).locator("button:enabled");
    await free.nth(3).click();
    await expect(page.getByRole("heading", { name: "Select checkout date" }).first()).toBeVisible();
    await free.nth(8).click();
    await expect(page).toHaveURL(/check_in=\d{4}-\d\d-\d\d&check_out=\d{4}-\d\d-\d\d/);
    const params = new URL(page.url()).searchParams;
    const second = (
      await quote(page, ANY, `check_in=${params.get("check_in")}&check_out=${params.get("check_out")}&adults=${listing.max_guests}`)
    ).body;
    expect(second.nights).toBe(5);
    await expect(priceDetails(page)).toContainText(`5 nights x ${rupees(second.nightly_price_minor)}`);
    await expect(priceDetails(page)).toContainText(`Total${rupees(second.total_minor)}`);
  });

  test("dates that are taken, and too many guests, show a message and cannot be reserved", async ({ page }) => {
    const availability = await (await page.request.get(`/api/listings/${NEARLY_FULL}/availability`)).json();
    const taken = availability.booked.find((range: { check_in: string }) => range.check_in > daysFromNow(1));
    await page.goto(`/rooms/${NEARLY_FULL}?check_in=${taken.check_in}&check_out=${taken.check_out}&adults=1`);
    expect((await quote(page, NEARLY_FULL, `check_in=${taken.check_in}&check_out=${taken.check_out}&adults=1`)).status).toBe(409);
    await expect(card(page).getByRole("alert")).toContainText("Those dates are not available");
    await expect(priceDetails(page)).toHaveCount(0);
    await expect(card(page).getByRole("button", { name: "Reserve" })).toBeDisabled();

    const listing = await (await page.request.get(`/api/listings/${NEARLY_FULL}`)).json();
    const free = `check_in=${daysFromNow(200)}&check_out=${daysFromNow(202)}`;
    await page.goto(`/rooms/${NEARLY_FULL}?${free}&adults=${listing.max_guests}&children=${17 - listing.max_guests > 0 ? 1 : 0}`);
    const refused = await quote(page, NEARLY_FULL, `${free}&adults=${listing.max_guests}&children=1`);
    expect(refused.status).toBe(422);
    await expect(card(page).getByRole("alert")).toContainText(refused.body.error.message);
    await expect(card(page).getByRole("button", { name: "Reserve" })).toBeDisabled();
  });

  test("Reserve asks for an account, then goes to checkout with the stay", async ({ page }) => {
    const [checkIn, checkOut] = [daysFromNow(100), daysFromNow(102)];
    await page.goto(`/rooms/${ANY}?check_in=${checkIn}&check_out=${checkOut}&adults=1`);
    await expect(priceDetails(page)).toBeVisible();
    await card(page).getByRole("button", { name: "Reserve" }).click();
    await accountPicker(page).getByRole("button", { name: /Meera Iyer/ }).click();
    await expect(page).toHaveURL(new RegExp(`/book/stays/${ANY}\\?check_in=${checkIn}&check_out=${checkOut}&adults=1$`));
  });

  test("a card on the search page opens the listing in its own tab, with the dates and guests", async ({
    page,
    context,
  }) => {
    const [checkIn, checkOut] = [daysFromNow(110), daysFromNow(113)];
    await page.goto(`/s/Jaipur/homes?checkin=${checkIn}&checkout=${checkOut}&adults=2`);
    const opened = context.waitForEvent("page");
    await cards(page).first().getByRole("link").click();
    const listingPage = await opened;
    await expect(listingPage).toHaveURL(new RegExp(`/rooms/\\d+\\?check_in=${checkIn}&check_out=${checkOut}&adults=2$`));
    const aside = listingPage.getByRole("complementary", { name: "Reserve this place" });
    await expect(aside).toContainText("2 guests");
    await expect(aside.getByLabel("Price details")).toContainText("3 nights x");
  });

  test("the same home opened again from a page without dates shows no dates, in the same tab", async ({
    page,
    context,
  }) => {
    // First from a search with dates: the listing opens in its tab with them.
    await page.goto(`/s/Jaipur/homes?checkin=${daysFromNow(30)}&checkout=${daysFromNow(33)}&adults=2`);
    const href = await cards(page).first().getByRole("link").getAttribute("href");
    const id = href!.split("/rooms/")[1].split("?")[0];
    const opened = context.waitForEvent("page");
    await cards(page).first().getByRole("link").click();
    const tab = await opened;
    const aside = tab.getByRole("complementary", { name: "Reserve this place" });
    await expect(aside.getByLabel("Price details")).toBeVisible();

    // Then from a search without dates, and from the home page: the same tab, now without
    // dates. Nothing carries over except what the link itself says.
    for (const from of ["/s/Jaipur/homes", "/"]) {
      await page.goto(from);
      await page.getByRole("main").locator(`a[href="/rooms/${id}"]`).first().click();
      await expect(tab).toHaveURL(new RegExp(`/rooms/${id}$`));
      await expect(aside).toContainText("Add date");
      await expect(aside).toContainText("1 guest");
      await expect(aside.getByLabel("Price details")).toHaveCount(0);
      await expect(aside.getByRole("button", { name: "Check availability" })).toBeVisible();
      expect(context.pages()).toHaveLength(2);
    }

    // And a search with other dates replaces them.
    await page.goto(`/s/Jaipur/homes?checkin=${daysFromNow(50)}&checkout=${daysFromNow(52)}&adults=3`);
    await page.getByRole("main").locator(`a[href^="/rooms/${id}?"]`).first().click();
    await expect(tab).toHaveURL(new RegExp(`check_in=${daysFromNow(50)}&check_out=${daysFromNow(52)}&adults=3$`));
    await expect(aside.getByLabel("Price details")).toContainText("2 nights x");
    expect(context.pages()).toHaveLength(2);
  });
});
