import { expect, test } from "@playwright/test";
import { cards, signIn } from "./helpers";

const WORDS = `Calm, clean and exactly as shown. ${Date.now()}`;

test("a guest reviews a stay that has ended, and finds the review on the profile page", async ({ page }) => {
  await page.goto("/");
  await signIn(page, "Arjun Kapoor");
  const trips = (await (await page.request.get("/api/bookings")).json()).items as {
    id: number;
    can_review: boolean;
    listing: { id: number; title: string };
  }[];
  const trip = trips.find((item) => item.can_review);
  expect(trip, "the seed leaves one recent stay unreviewed").toBeTruthy();
  if (!trip) return;

  // Trips marks it; an upcoming stay offers no form.
  await page.goto("/trips");
  await expect(page.getByRole("main").getByText("Write a review")).toHaveCount(1);

  await page.goto(`/trips/${trip.id}`);
  const form = page.getByRole("form", { name: "Review your stay" });
  const post = form.getByRole("button", { name: "Post review" });
  await expect(post).toBeDisabled();
  await form.getByRole("radio", { name: "5 out of 5" }).check({ force: true });
  await form.getByLabel("Your review").fill(WORDS);
  await post.click();

  await expect(page.getByText("Review posted")).toBeVisible();
  const written = page.getByRole("region", { name: "Your review" });
  await expect(written).toContainText(WORDS);
  await expect(written.getByRole("img", { name: "5 out of 5" })).toBeVisible();
  await expect(form).toHaveCount(0);

  // It is on the listing, under the guest's name, and cannot be written twice.
  const listed = await (await page.request.get(`/api/listings/${trip.listing.id}/reviews`)).json();
  expect(listed.items[0]).toMatchObject({ comment: WORDS, rating: 5, author: { name: "Arjun Kapoor" } });
  const again = await page.request.post(`/api/bookings/${trip.id}/review`, { data: { rating: 1, comment: "Again" } });
  expect(again.status()).toBe(409);

  // The profile page: the card, and the reviews this guest has written.
  await page.goto("/users/profile");
  await expect(page.getByRole("heading", { name: "About me", level: 1 })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Arjun");
  await expect(page.getByRole("main").getByText("Guest", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show reviews I’ve written" }).click();
  const mine = page.getByRole("list", { name: "Reviews I’ve written" }).getByRole("listitem");
  await expect(mine.first()).toContainText(WORDS);
  await expect(mine.first().getByRole("link", { name: trip.listing.title })).toBeVisible();
});

test("the profile page asks a visitor to log in, and calls a host a host", async ({ page }) => {
  await page.goto("/users/profile");
  await expect(page.getByRole("main").getByText("Log in to see your profile.")).toBeVisible();
  await signIn(page, "Vikram Mehta");
  await page.goto("/users/profile");
  await expect(page.getByRole("main").getByText("Host", { exact: true })).toBeVisible();
});

test("badges: a guest favourite on its card, a Superhost on the listing page", async ({ page }) => {
  // Find one of each in the seed through the API, then check the screens say the same.
  const found = (await (await page.request.get("/api/listings?location=Goa&page_size=40")).json()).items as {
    id: number;
    guest_favourite: boolean;
  }[];
  const favourites = found.filter((item) => item.guest_favourite).length;
  expect(favourites).toBeGreaterThan(0);
  expect(favourites).toBeLessThan(found.length);

  await page.goto("/s/Goa/homes");
  await expect(cards(page).first()).toBeVisible();
  const shown = await cards(page).count();
  const onPage = found.slice(0, shown).filter((item) => item.guest_favourite).length;
  await expect(cards(page).getByText("Guest favourite")).toHaveCount(onPage);

  let superhost: { id: number; host: { name: string } } | undefined;
  let plain: { id: number } | undefined;
  for (let id = 1; id <= 120 && !(superhost && plain); id++) {
    const listing = await (await page.request.get(`/api/listings/${id}`)).json();
    if (listing.host.is_superhost) superhost ??= listing;
    else plain ??= listing;
  }
  expect(superhost, "the seed has a Superhost").toBeTruthy();
  expect(plain, "the seed has a host who is not one").toBeTruthy();
  if (!superhost || !plain) return;

  await page.goto(`/rooms/${superhost.id}`);
  await expect(
    page.getByRole("heading", { name: `${superhost.host.name.split(" ")[0]} is a Superhost` }),
  ).toBeVisible();
  await page.goto(`/rooms/${plain.id}`);
  await expect(page.getByRole("heading", { name: "Meet your host" })).toBeVisible();
  await expect(page.getByRole("main").getByText(/Superhost/)).toHaveCount(0);
});
