import { expect, test, type Page } from "@playwright/test";
import { freeListing, nextMonth, rupees, signedIn } from "./helpers";

/*
 * The edge cases of booking and hosting (plan §13), in a real browser. Each one is a rule
 * the server enforces; these check that the screens say what happened.
 */

const HOST = "Vikram Mehta";
const GUEST = "Arjun Kapoor";
const [FIRST, SECOND, THIRD, LAST] = [nextMonth(18), nextMonth(20), nextMonth(22), nextMonth(26)];

type Listing = { id: number; title: string; max_guests: number; pets_allowed: boolean; price_per_night_minor: number };

/** One of the host's seeded listings that is free for the dates these tests use. */
async function hostListing(host: Page): Promise<Listing> {
  const mine = await (await host.request.get("/api/hosting/listings")).json();
  const ids = (mine.items as { id: number }[]).map((item) => item.id);
  const id = await freeListing(host, ids, FIRST, LAST);
  return (await host.request.get(`/api/listings/${id}`)).json();
}

const pay = (page: Page) => page.getByRole("button", { name: "Confirm and pay" });
const priceDetails = (page: Page) => page.getByLabel("Price details");

test("a host cannot book their own listing", async ({ browser }) => {
  const host = await signedIn(browser, HOST);
  const listing = await hostListing(host);

  await host.goto(`/book/stays/${listing.id}?check_in=${FIRST}&check_out=${SECOND}&adults=1`);
  await pay(host).click();
  await expect(host.getByText("You cannot book your own listing.")).toBeVisible();
  const trips = await (await host.request.get("/api/bookings")).json();
  expect(trips.items.filter((trip: { listing: { id: number } }) => trip.listing.id === listing.id)).toHaveLength(0);
});

test("more guests than the listing takes are refused, on the listing and at checkout", async ({ browser }) => {
  const guest = await signedIn(browser, GUEST);
  const host = await signedIn(browser, HOST);
  const listing = await hostListing(host);
  const tooMany = `check_in=${FIRST}&check_out=${SECOND}&adults=${listing.max_guests + 1}`;

  // The listing page never shows more guests than the listing takes, whatever the address says.
  await guest.goto(`/rooms/${listing.id}?${tooMany}`);
  const card = guest.getByRole("complementary", { name: "Reserve this place" });
  await card.getByRole("button", { name: /Guests/ }).click();
  await expect(card.getByRole("button", { name: "Increase Adults" })).toBeDisabled();

  // Checkout with the address typed by hand: the server's refusal is shown, nothing can be paid.
  await guest.goto(`/book/stays/${listing.id}?${tooMany}`);
  await expect(guest.getByRole("main").getByRole("alert")).toContainText(/guest/i);
  await expect(pay(guest)).toHaveCount(0);
});

test("a price edit: new quotes change, the open checkout is told, booked stays keep their price", async ({
  browser,
}) => {
  const host = await signedIn(browser, HOST);
  const guest = await signedIn(browser, GUEST);
  const listing = await hostListing(host);

  // The guest books a first stay at today's price.
  await guest.goto(`/book/stays/${listing.id}?check_in=${FIRST}&check_out=${SECOND}&adults=1`);
  await expect(priceDetails(guest)).toContainText("Total");
  await pay(guest).click();
  await expect(guest).toHaveURL(/\/trips\/\d+$/);
  const firstTrip = guest.url();
  const paid = (await (await guest.request.get(`/api/bookings/${firstTrip.split("/trips/")[1]}`)).json()).total_minor;
  await expect(guest.getByRole("main")).toContainText(rupees(paid));

  // And opens checkout for a second one.
  const second = `check_in=${THIRD}&check_out=${LAST}&adults=1`;
  await guest.goto(`/book/stays/${listing.id}?${second}`);
  const before = (await (await guest.request.get(`/api/listings/${listing.id}/quote?${second}`)).json()).total_minor;
  await expect(priceDetails(guest)).toContainText(`Total${rupees(before)}`);

  // The host raises the price with the edit form.
  await host.goto("/hosting");
  await host.getByRole("button", { name: `Edit ${listing.title}` }).click();
  const form = host.getByRole("dialog", { name: "Edit listing" });
  const price = form.getByLabel("Price per night (₹)");
  await expect(price).toHaveValue(String(listing.price_per_night_minor / 100));
  await price.fill(String(listing.price_per_night_minor / 100 + 1000));
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(host.getByText("Listing updated")).toBeVisible();

  // The guest's old total is refused; the new one is shown, and confirming again books it.
  await pay(guest).click();
  await expect(guest.getByText("The price changed. Review the new total and confirm again.")).toBeVisible();
  const after = (await (await guest.request.get(`/api/listings/${listing.id}/quote?${second}`)).json()).total_minor;
  expect(after).toBeGreaterThan(before);
  await expect(priceDetails(guest)).toContainText(`Total${rupees(after)}`);
  await pay(guest).click();
  await expect(guest).toHaveURL(/\/trips\/\d+$/);
  await expect(guest.getByRole("main")).toContainText(rupees(after));

  // The first stay still costs what was paid for it.
  await guest.goto(firstTrip);
  await expect(guest.getByRole("main")).toContainText(rupees(paid));

  // The host sees both reservations, and cannot remove the listing while they are ahead.
  await host.getByRole("tab", { name: "Reservations" }).click();
  const reservations = host.getByRole("list", { name: "Reservations" }).getByRole("listitem");
  await expect(reservations.filter({ hasText: listing.title }).filter({ hasText: GUEST }).filter({ hasText: rupees(paid) })).toHaveCount(1);
  await expect(reservations.filter({ hasText: listing.title }).filter({ hasText: GUEST }).filter({ hasText: rupees(after) })).toHaveCount(1);

  await host.getByRole("tab", { name: "Listings" }).click();
  await host.getByRole("button", { name: `Remove ${listing.title}` }).click();
  const dialog = host.getByRole("dialog", { name: "Remove this listing?" });
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(dialog.getByText("This listing has upcoming reservations, so it cannot be removed yet.")).toBeVisible();
  expect((await host.request.get(`/api/listings/${listing.id}`)).status()).toBe(200);
});

test("the listing form refuses a bad listing with a message for each field", async ({ browser }) => {
  const host = await signedIn(browser, HOST);
  await host.goto("/hosting");
  await host.getByRole("button", { name: "Create listing" }).click();
  const form = host.getByRole("dialog", { name: "Create listing" });
  await form.getByLabel("Title").fill("A flat with a bad photo");
  await form.getByLabel("Description").fill("The photo address is not https.");
  await form.getByLabel("City").fill("Udaipur");
  await form.getByLabel("Price per night (₹)").fill("4000");
  await form.getByLabel("Photo URLs (one https address per line)").fill("http://example.com/photo.jpg");
  await form.getByRole("button", { name: "Publish listing" }).click();
  await expect(form.getByRole("alert")).toContainText("Please correct these fields:");
  await expect(form.getByRole("alert").getByRole("listitem").first()).toBeVisible();
  await expect(form).toBeVisible();
});
